import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function HowItWorksAccordion() {
  return (
    <div className="rounded-lg border border-border bg-surface-1">
      <Accordion type="single" collapsible>
        <AccordionItem
          value="exchange"
          className="border-b border-border/60 px-4">
          <AccordionTrigger className="text-[13px] font-medium">
            1. Exchange credentials for a token
          </AccordionTrigger>
          <AccordionContent className="text-[12.5px] leading-relaxed text-muted-foreground">
            Your consumer key and secret are combined as{" "}
            <code className="font-mono text-foreground">key:secret</code>,
            base64-encoded, and sent as{" "}
            <code className="font-mono text-foreground">
              Authorization: Basic &lt;encoded&gt;
            </code>{" "}
            to{" "}
            <code className="font-mono text-foreground">
              /oauth/v1/generate
            </code>
            . This is the only Daraja call that uses Basic Auth — everything
            else uses the token you get back.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="expiry"
          className="border-b border-border/60 px-4">
          <AccordionTrigger className="text-[13px] font-medium">
            2. The token expires in about an hour
          </AccordionTrigger>
          <AccordionContent className="text-[12.5px] leading-relaxed text-muted-foreground">
            Real Daraja tokens last roughly 3600 seconds. Your app should fetch
            a new one when a call fails with an auth error, not just once at
            startup.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem
          value="bearer"
          className="border-b border-border/60 px-4">
          <AccordionTrigger className="text-[13px] font-medium">
            3. Every other call needs it as Bearer auth
          </AccordionTrigger>
          <AccordionContent className="text-[12.5px] leading-relaxed text-muted-foreground">
            STK Push, C2B, and every other Daraja endpoint expect{" "}
            <code className="font-mono text-foreground">
              Authorization: Bearer &lt;token&gt;
            </code>
            , not the Basic Auth used to fetch the token itself.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="enforcement" className="px-4">
          <AccordionTrigger className="text-[13px] font-medium">
            Does daraja-local check the token?
          </AccordionTrigger>
          <AccordionContent className="text-[12.5px] leading-relaxed text-muted-foreground">
            Not yet — the STK Push and C2B simulation endpoints don&apos;t exist
            server-side yet, so there&apos;s nothing to enforce it on currently.
            This page still lets you exercise your app&apos;s token-fetch logic
            ahead of that.
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
