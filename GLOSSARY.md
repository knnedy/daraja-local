# Daraja Local

An offline emulator of Safaricom's M-Pesa Daraja API. It stands in for Safaricom so a developer can exercise STK Push and C2B integrations on their own machine and choose how each payment ends.

## Language

### Projects

**Project**:
An isolated workspace standing in for one Daraja app, with its own Credentials, Settings and Request Log.
_Avoid_: App, workspace, tenant, account

**Credentials**:
The consumer key, consumer secret, Shortcode and passkey generated for a Project, which the developer's app uses in place of real Daraja credentials.
_Avoid_: Keys, secrets, API keys

**Shortcode**:
The Paybill or Till number that identifies a Project in Daraja requests.
_Avoid_: Paybill, till, business number

**Access Token**:
The short-lived Bearer token a developer's app obtains with its consumer key and secret and presents on every Daraja call.
_Avoid_: OAuth token, bearer, auth token

**Settings**:
Per-Project simulation defaults, such as the STK Timeout and the default phone number.
_Avoid_: Config, preferences

### STK Push

**STK Push**:
A request from the developer's app asking a customer to approve a payment on their phone.
_Avoid_: M-Pesa Express, Lipa na M-Pesa Online, push

**Acceptance**:
The immediate reply saying a request was received for processing. It says nothing about how the payment ends.
_Avoid_: Success response, ack

**Session**:
One accepted STK Push from Acceptance until it is resolved. It is Pending until then, and is lost if Daraja Local stops.
_Avoid_: Pending request, transaction, checkout

**Virtual Phone**:
The simulated customer handset on which a Pending Session waits for an Outcome.
_Avoid_: Simulator, handset, phone mock

**Outcome**:
How a Session ends: approved, wrong PIN, insufficient balance, cancelled, or timeout. Each maps to one Daraja ResultCode.
_Avoid_: Result, status, response

**Resolve**:
To give a Pending Session its Outcome, which can happen once per Session.
_Avoid_: Complete, finish, settle

**Timeout**:
The Outcome a Session receives when nobody resolves it within the Project's configured wait.
_Avoid_: Expiry, expiration

**Callback**:
The result Daraja Local sends to the developer's `CallBackURL` after a Session is resolved.
_Avoid_: Webhook, notification, result

### C2B

**C2B**:
A customer paying a Shortcode directly, which the developer's app learns about through Validation and Confirmation.
_Avoid_: Customer to business, paybill payment

**Registration**:
A Project's current Confirmation URL, optional Validation URL and Response Type. Registering again replaces it.
_Avoid_: URL registration, webhook setup

**Simulated Payment**:
A C2B payment triggered through the simulate endpoint, standing in for a real customer paying from their phone.
_Avoid_: Simulation, transaction, test payment

**Validation**:
The optional step in which the developer's Validation URL is asked whether to accept or reject a Simulated Payment. It runs only when a Validation URL is registered.
_Avoid_: External validation, pre-check

**Confirmation**:
The notice sent to the developer's Confirmation URL that a Simulated Payment went through. It cannot be rejected.
_Avoid_: Callback, completion

**Response Type**:
The default action, Completed or Cancelled, applied when the Validation URL cannot answer. It does not turn Validation on or off.
_Avoid_: Fallback mode, validation mode

**Request Validation**:
Daraja Local's own check that an incoming request is well formed, answered with a Daraja-shaped error when it is not. Distinct from Validation, which is the developer's decision on a payment.
_Avoid_: Validation (unqualified), input checking

### Delivery

**Delivery**:
Daraja Local's attempt to get a Callback, Validation or Confirmation to the developer's server, made up of one or more Attempts.
_Avoid_: Dispatch, send, webhook call

**Attempt**:
A single try within a Delivery, with the status code or error it produced.
_Avoid_: Retry, try

### Request Log

**Request Log**:
A Project's durable history of what the developer's app sent and what Daraja Local sent back or on to the developer's server.
_Avoid_: Logs, history, audit log, activity

**Entry**:
One recorded message in the Request Log, with a Direction, a status and its full payload.
_Avoid_: Row, record, log line

**Direction**:
Whether an Entry was received by Daraja Local (inbound) or sent by it (outbound).
_Avoid_: Type, side

**Transaction ID**:
The identifier tying together every Entry for one payment: the `CheckoutRequestID` for STK Push, the `ConversationID` for C2B.
_Avoid_: Correlation ID, request ID, reference

**Group**:
All Entries sharing a Transaction ID, shown as one payment from request to Delivery.
_Avoid_: Transaction, thread, trace

### Fidelity

**Fidelity**:
How closely Daraja Local matches real Daraja on the wire: routes, field names, error codes and callback shapes, quirks included.
_Avoid_: Compatibility, accuracy, parity

**Known Difference**:
A documented place where Daraja Local deliberately or unavoidably departs from real Daraja, recorded with a confidence level.
_Avoid_: Deviation, gap, bug
