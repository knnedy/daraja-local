import StkForm from "./components/stk-form";
import VirtualPhone from "./components/virtual-phone";
import PayloadConsole from "./components/payload-console";

export default function StkPushPage() {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="mb-0.5 font-heading text-[21px] font-medium text-foreground">
          STK Push
        </h1>
        <p className="text-[13px] text-muted-foreground">
          Simulate the customer prompt for /mpesa/stkpush/v1/processrequest.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_320px]">
        <StkForm />
        <div className="flex flex-col gap-4">
          <VirtualPhone />
          <PayloadConsole />
        </div>
      </div>
    </div>
  );
}
