/**
 * SMS / short-code fixtures. The dashboard mockup shows SMS as one
 * of the 5 active integrations; in production this would be Twilio.
 */

import type { SmsMessage } from "./types";
import { hoursAgo, minutesAgo, daysAgo } from "./time";

const ME = "+15555550199";

export const SMS_MESSAGES: SmsMessage[] = [
  {
    id: "sms_1",
    from: "+15558675309",          // Mike's cell
    to:   ME,
    body: "Heads up — pushed the rollback section to the runbook. PR #149 incoming.",
    date: minutesAgo(20),
    direction: "inbound",
  },
  {
    id: "sms_2",
    from: ME,
    to:   "+15558675309",
    body: "Thanks. Will review tomorrow.",
    date: minutesAgo(15),
    direction: "outbound",
  },
  {
    id: "sms_3",
    from: "+18002255288",           // ride share
    to:   ME,
    body: "Your ride is arriving — Toyota Camry, license PLT-432. Driver: Carlos.",
    date: hoursAgo(2.5),
    direction: "inbound",
  },
  {
    id: "sms_4",
    from: "+15555551234",            // Acme contact
    to:   ME,
    body: "Hi Jane, Dana from Acme. Quick text — pushing our internal release by 2 days. Don't sweat the SSO ETA today.",
    date: hoursAgo(1.5),
    direction: "inbound",
  },
  {
    id: "sms_5",
    from: "692-87",                  // 2FA short code
    to:   ME,
    body: "Your verification code is 492835. Don't share with anyone.",
    date: hoursAgo(4),
    direction: "inbound",
  },
  {
    id: "sms_6",
    from: ME,
    to:   "+15554443377",
    body: "Running 5 min late to coffee — see you soon.",
    date: daysAgo(1, 16),
    direction: "outbound",
  },
];
