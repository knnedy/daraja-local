# Using Daraja Local with your app

Moving an integration from Safaricom's sandbox to Daraja Local changes two things: the **base URL** and the **credentials**. Paths, request bodies, authentication and the callback shape stay the same, so the code you test is the code you ship.

## 1. Make the base URL configurable

If Safaricom's URL is written into your code, your requests go straight to Safaricom and never reach Daraja Local. Nothing will appear on the Request Log page. Read the base URL from configuration instead, defaulting to Safaricom's sandbox:

```
https://sandbox.safaricom.co.ke   # Safaricom sandbox
https://api.safaricom.co.ke       # Safaricom production
http://127.0.0.1:7060             # Daraja Local (use the address printed at startup)
```

Set these five variables. The Environment card on the Overview page has them ready to copy:

| Variable                 | Value                                         |
| ------------------------ | --------------------------------------------- |
| `DARAJA_BASE_URL`        | the `running at` address Daraja Local printed |
| `DARAJA_CONSUMER_KEY`    | your project's consumer key                   |
| `DARAJA_CONSUMER_SECRET` | your project's consumer secret                |
| `DARAJA_SHORTCODE`       | your project's shortcode                      |
| `DARAJA_PASSKEY`         | your project's passkey                        |

Use the credentials of the project you're testing against. A key from one project can't authenticate against another.

## 2. A complete example

Each example does the same three things:

1. Gets an access token.
2. Sends a KES 100 STK Push to `254712345678`.
3. Starts a small server on `127.0.0.1:4000` that prints the callback when it arrives.

After starting one, open the STK Push page. The request is waiting on the Virtual Phone. Pick an outcome and the callback prints in your terminal.

### Go

```bash
go run main.go
```

```go
package main

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"time"
)

func env(name, fallback string) string {
	if v := os.Getenv(name); v != "" {
		return v
	}
	return fallback
}

var (
	baseURL   = env("DARAJA_BASE_URL", "https://sandbox.safaricom.co.ke")
	key       = os.Getenv("DARAJA_CONSUMER_KEY")
	secret    = os.Getenv("DARAJA_CONSUMER_SECRET")
	shortcode = os.Getenv("DARAJA_SHORTCODE")
	passkey   = os.Getenv("DARAJA_PASSKEY")
)

func accessToken() (string, error) {
	req, err := http.NewRequest(http.MethodGet, baseURL+"/oauth/v1/generate?grant_type=client_credentials", nil)
	if err != nil {
		return "", err
	}
	req.SetBasicAuth(key, secret)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("token request failed: %d %s", resp.StatusCode, body)
	}

	var out struct {
		AccessToken string `json:"access_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", err
	}
	return out.AccessToken, nil
}

func stkPush(token, phone, amount string) error {
	timestamp := time.Now().Format("20060102150405")
	password := base64.StdEncoding.EncodeToString([]byte(shortcode + passkey + timestamp))

	payload, err := json.Marshal(map[string]string{
		"BusinessShortCode": shortcode,
		"Password":          password,
		"Timestamp":         timestamp,
		"TransactionType":   "CustomerPayBillOnline",
		"Amount":            amount,
		"PartyA":            phone,
		"PartyB":            shortcode,
		"PhoneNumber":       phone,
		"CallBackURL":       "http://127.0.0.1:4000/payments/callback",
		"AccountReference":  "Order-1",
		"TransactionDesc":   "Test payment",
	})
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, baseURL+"/mpesa/stkpush/v1/processrequest", bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	fmt.Println(resp.StatusCode, string(body))
	return nil
}

func callbackHandler(w http.ResponseWriter, r *http.Request) {
	var cb struct {
		Body struct {
			StkCallback struct {
				CheckoutRequestID string `json:"CheckoutRequestID"`
				ResultCode        int    `json:"ResultCode"`
				ResultDesc        string `json:"ResultDesc"`
			} `json:"stkCallback"`
		} `json:"Body"`
	}
	if err := json.NewDecoder(r.Body).Decode(&cb); err != nil {
		http.Error(w, "bad body", http.StatusBadRequest)
		return
	}

	c := cb.Body.StkCallback
	fmt.Println("callback:", c.CheckoutRequestID, c.ResultCode, c.ResultDesc)

	w.Header().Set("Content-Type", "application/json")
	fmt.Fprint(w, `{"ResultCode":0,"ResultDesc":"Accepted"}`)
}

func main() {
	http.HandleFunc("/payments/callback", callbackHandler)
	go func() { log.Fatal(http.ListenAndServe("127.0.0.1:4000", nil)) }()

	token, err := accessToken()
	if err != nil {
		log.Fatal(err)
	}
	if err := stkPush(token, "254712345678", "100"); err != nil {
		log.Fatal(err)
	}

	select {} // wait for the callback; Ctrl+C to exit
}
```

### Node.js

Node 18 or newer (for the built-in `fetch`).

```bash
npm install express
node index.mjs
```

```js
import express from "express";

const BASE_URL =
  process.env.DARAJA_BASE_URL ?? "https://sandbox.safaricom.co.ke";
const {
  DARAJA_CONSUMER_KEY: KEY,
  DARAJA_CONSUMER_SECRET: SECRET,
  DARAJA_SHORTCODE: SHORTCODE,
  DARAJA_PASSKEY: PASSKEY,
} = process.env;

async function accessToken() {
  const basic = Buffer.from(`${KEY}:${SECRET}`).toString("base64");
  const res = await fetch(
    `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${basic}` } },
  );
  if (!res.ok) {
    throw new Error(`token request failed: ${res.status} ${await res.text()}`);
  }
  return (await res.json()).access_token;
}

async function stkPush(token, phone, amount) {
  const timestamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const password = Buffer.from(`${SHORTCODE}${PASSKEY}${timestamp}`).toString(
    "base64",
  );

  const res = await fetch(`${BASE_URL}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      BusinessShortCode: SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: amount,
      PartyA: phone,
      PartyB: SHORTCODE,
      PhoneNumber: phone,
      CallBackURL: "http://127.0.0.1:4000/payments/callback",
      AccountReference: "Order-1",
      TransactionDesc: "Test payment",
    }),
  });
  console.log(res.status, await res.text());
}

const app = express();
app.use(express.json());

app.post("/payments/callback", (req, res) => {
  const cb = req.body.Body.stkCallback;
  console.log("callback:", cb.CheckoutRequestID, cb.ResultCode, cb.ResultDesc);
  res.status(200).json({ ResultCode: 0, ResultDesc: "Accepted" });
});

app.listen(4000, "127.0.0.1");

await stkPush(await accessToken(), "254712345678", "100");
```

### Python

```bash
pip install flask requests
python main.py
```

```python
import base64
import os
import threading
import time

import requests
from flask import Flask, jsonify, request

BASE_URL = os.environ.get("DARAJA_BASE_URL", "https://sandbox.safaricom.co.ke")
KEY = os.environ["DARAJA_CONSUMER_KEY"]
SECRET = os.environ["DARAJA_CONSUMER_SECRET"]
SHORTCODE = os.environ["DARAJA_SHORTCODE"]
PASSKEY = os.environ["DARAJA_PASSKEY"]


def access_token():
    r = requests.get(
        f"{BASE_URL}/oauth/v1/generate",
        params={"grant_type": "client_credentials"},
        auth=(KEY, SECRET),
        timeout=10,
    )
    r.raise_for_status()
    return r.json()["access_token"]


def stk_push(token, phone, amount):
    timestamp = time.strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(f"{SHORTCODE}{PASSKEY}{timestamp}".encode()).decode()

    r = requests.post(
        f"{BASE_URL}/mpesa/stkpush/v1/processrequest",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "BusinessShortCode": SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone,
            "PartyB": SHORTCODE,
            "PhoneNumber": phone,
            "CallBackURL": "http://127.0.0.1:4000/payments/callback",
            "AccountReference": "Order-1",
            "TransactionDesc": "Test payment",
        },
        timeout=10,
    )
    print(r.status_code, r.text)


app = Flask(__name__)


@app.post("/payments/callback")
def callback():
    cb = request.get_json()["Body"]["stkCallback"]
    print("callback:", cb["CheckoutRequestID"], cb["ResultCode"], cb["ResultDesc"])
    return jsonify(ResultCode=0, ResultDesc="Accepted"), 200


if __name__ == "__main__":
    threading.Timer(1.0, lambda: stk_push(access_token(), "254712345678", "100")).start()
    app.run(host="127.0.0.1", port=4000)
```

## 3. What your callback handler must do

**Return exactly HTTP 200.** Daraja Local treats any other status, including 201, 202 and 204, or a network error, as a failed delivery. It makes up to three attempts in total, waiting 1 second after the first failure and 2 seconds after the second, and each attempt times out after 10 seconds. These retry rules are emulator behavior, not verified Safaricom behavior (see [Fidelity](fidelity.md)).

**Respond first, work after.** Acknowledge quickly and do the slow work (database writes, emails) after responding, so a slow handler isn't mistaken for a failed delivery and retried.

**Deduplicate by `CheckoutRequestID`.** If your handler does its work and then fails to return 200, the same callback arrives again.

**Branch on `ResultCode`, not `ResultDesc`.** `ResultCode` is a number and `0` means success. A successful callback looks like this:

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_191220191020363925",
      "ResultCode": 0,
      "ResultDesc": "The service request is processed successfully.",
      "CallbackMetadata": {
        "Item": [
          { "Name": "Amount", "Value": 100 },
          { "Name": "MpesaReceiptNumber", "Value": "NLJ7RT61SV" },
          { "Name": "TransactionDate", "Value": 20261022101530 },
          { "Name": "PhoneNumber", "Value": 254712345678 }
        ]
      }
    }
  }
}
```

A failed one has no `CallbackMetadata` at all:

```json
{
  "Body": {
    "stkCallback": {
      "MerchantRequestID": "29115-34620561-1",
      "CheckoutRequestID": "ws_CO_191220191020363925",
      "ResultCode": 1032,
      "ResultDesc": "Request cancelled by user"
    }
  }
}
```

In `CallbackMetadata.Item`, each `Value` has its own type: `Amount`, `TransactionDate` (`yyyyMMddHHmmss`) and `PhoneNumber` are numbers, and `MpesaReceiptNumber` is a string. Decode `Value` as a generic type and convert per item. The full list of outcomes and result codes is in [STK Push](stk-push.md).

## 4. Callback URLs

Daraja Local sends callbacks from your own machine, so a `localhost` or `127.0.0.1` URL works and you don't need a tunnel. Safaricom's real sandbox can't reach `localhost`. When you switch back to it, your `CallBackURL` has to be publicly reachable over HTTPS, for example through a tunnel.

Daraja Local only listens on `127.0.0.1`, so an app running inside a container on default networking can't reach it. Run your app directly on your machine while testing.

## 5. Confirm requests are arriving

Open the Request Log page right after sending a request. You should see a `REQ` row and an `ACK` row within milliseconds. If nothing appears:

- Your app is still calling Safaricom. Check that the base URL is really read from configuration.
- Your app is calling the wrong port. Daraja Local moves to the next free port if `7060` is busy, so check the address in the startup banner, or pin the port with `DARAJA_LOCAL_PORT` (see [Getting started](getting-started.md#the-port)).

## Common mistakes

- **Numbers as JSON numbers.** Every request field is a string, including `Amount`, `PartyA`, `PartyB`, `PhoneNumber`, `BusinessShortCode` and `Timestamp`. Sending `"Amount": 100` fails with `400.002.02 Bad Request - Invalid request body`.
- **Handler returns 204.** It's a failed delivery, so you'll see retries and a `failed` status in the Request Log.
- **Wrong password.** It must be `base64(shortcode + passkey + timestamp)`, using the same `Timestamp` you send in the body.

The full list of errors and what they mean is in [Troubleshooting](troubleshooting.md).

## C2B

C2B uses the same base URL and the same bearer token. Your app calls `registerurl` once, then you call `simulate` to test. See [C2B](c2b.md).

## Going back to Safaricom

Change only the base URL, the credentials (consumer key, secret, shortcode and passkey), and the callback URL, which must be publicly reachable. No other code changes.
