const brokenHtml = `<!doctype html>
<html>
  <body>
    <!-- builder-debug: campaign draft exported from AI copy pass -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#ffffff;padding:24px;">
          <h1>Summer Launch</h1>
          <p>Hi {{ first_name, your early access offer is ready.</p>
          <p>Lorem ipsum placeholder copy that should not ship.</p>
          <a href="#" style="background:#111;color:#fff;padding:12px 18px;">Shop the launch</a>
          <a href="">Read the details</a>
          <a href="https://example.com/product?utm_source=newsletter&utm_campaign=summer-a">Secondary CTA</a>
          <a href="https://example.com/product?utm_source=newsletter&utm_campaign=summer-b">Same product</a>
          <img src="https://cdn.example.com/hero-transparent.png">
          <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA">
        </td>
      </tr>
    </table>
  </body>
</html>`;

const chatGptFixedHtml = `<!doctype html>
<html>
  <body>
    <div style="display:none;max-height:0;overflow:hidden;">Preview the new collection before it sells out.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#ffffff;padding:24px;">
          <h1>Summer Launch</h1>
          <p>Hi {{ first_name }}, your early access offer is ready.</p>
          <p>Browse the new arrivals before the public launch.</p>
          <a href="#" style="background:#111;color:#fff;padding:12px 18px;">Shop the launch</a>
          <a href="https://shop.example.com/product">Read the details</a>
          <img src="https://cdn.example.com/hero-transparent.png" alt="">
        </td>
      </tr>
    </table>
  </body>
</html>`;

const gmailClippingHtml = `<!doctype html>
<html>
  <body>
    <div style="display:none;max-height:0;overflow:hidden;">Huge campaign preview text.</div>
    <h1>Large Retail Campaign</h1>
    <a href="https://shop.example.com/collection?utm_source=email&utm_medium=campaign&utm_campaign=large-drop">Shop now</a>
    <p><a href="https://shop.example.com/unsubscribe">Unsubscribe</a></p>
    ${"<!-- repeated-builder-css-padding -->\n".repeat(3400)}
  </body>
</html>`;

const knownGoodHtml = `<!doctype html>
<html>
  <body>
    <div class="preheader" style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;max-height:0;max-width:0;">Your weekly product update is ready.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#ffffff;color:#171b22;padding:24px;">
          <h1>Weekly Product Update</h1>
          <p>Three improvements shipped this week.</p>
          <a href="https://kiku.ai/update?utm_source=email&utm_medium=campaign&utm_campaign=weekly_update" target="_blank" rel="noopener noreferrer" style="background:#2457d6;color:#ffffff;padding:12px 18px;">Read the update</a>
          <img src="https://cdn.example.com/update-hero.jpg" alt="Product dashboard" width="640" height="320">
          <p><a href="https://kiku.ai/preferences" target="_blank" rel="noopener noreferrer">Manage preferences</a></p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const cssNotInlinedHtml = `<!doctype html>
<html>
  <head>
    <style>
      .button { background:#2457d6; color:#ffffff; padding:12px 18px; }
      .copy { color:#171b22; line-height:1.5; }
    </style>
  </head>
  <body>
    <div style="display:none;max-height:0;overflow:hidden;">Final proof before sending.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#ffffff;padding:24px;">
          <p class="copy">This campaign still depends on a style block.</p>
          <a class="button" href="https://shop.kiku.ai/drop?utm_source=email&utm_medium=campaign&utm_campaign=style_inline" target="_blank" rel="noopener noreferrer">Shop the drop</a>
          <img src="https://cdn.kiku.ai/drop.jpg" alt="New product drop" width="640" height="320">
          <p><a href="https://shop.kiku.ai/preferences" target="_blank" rel="noopener noreferrer">Manage preferences</a></p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

const mailchimpMergeTagsHtml = `<!doctype html>
<html>
  <body>
    <div style="display:none;max-height:0;overflow:hidden;">A member-only update for *|FNAME|*.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#ffffff;color:#171b22;padding:24px;">
          <h1>Hello *|FNAME|*</h1>
          <p>Your subscriber update is ready.</p>
          <a href="https://example.org/member-update?utm_source=email&utm_medium=campaign&utm_campaign=mailchimp_merge" target="_blank" rel="noopener noreferrer">Open update</a>
          <img src="https://cdn.example.org/member.jpg" alt="Member update preview" width="600" height="300">
          <p><a href="*|UNSUB|*">Unsubscribe</a></p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

export const fixtures = [
  {
    id: "broken-agency-draft",
    name: "Broken agency draft",
    description: "Bad links, broken token, missing preheader, missing unsubscribe, image issues, and mixed UTM.",
    html: brokenHtml
  },
  {
    id: "chatgpt-fixed-still-risky",
    name: "Verify after ChatGPT",
    description: "Cleaner AI-edited email that still has deterministic send risks.",
    html: chatGptFixedHtml
  },
  {
    id: "gmail-clipping-risk",
    name: "Gmail clipping risk",
    description: "Large exported campaign near Gmail clipping territory.",
    html: gmailClippingHtml
  },
  {
    id: "known-good-baseline",
    name: "Known-good baseline",
    description: "Conservative email fixture that should avoid critical issues.",
    html: knownGoodHtml
  },
  {
    id: "css-not-inlined",
    name: "CSS not inlined",
    description: "Valid-looking campaign that still depends on style blocks.",
    html: cssNotInlinedHtml
  },
  {
    id: "mailchimp-merge-tags",
    name: "Mailchimp merge tags",
    description: "Balanced Mailchimp-style merge tags and unsubscribe placeholder.",
    html: mailchimpMergeTagsHtml
  }
];
