# Clean order emails

## What will change
- Fix the email formatting so HTML markup never appears as visible text.
- Center the confirmation tick above the customer’s “Order Confirmed” message.
- Keep the customer email’s complete order, delivery, payment, item, and total details.
- Upgrade the admin order email with the customer’s name, login email, phone, full delivery address, payment details, ordered items, totals, receipt link, and admin order link.
- Remove fragile emoji and special-character subject formatting that currently appears as encoded text in some inboxes.

## Technical details
- Correct MIME/header encoding for Gmail and Hostinger compatibility.
- Simplify the confirmation panel to email-client-safe table markup and inline styles.
- Ensure both COD and verified online-payment paths pass the same complete data to the admin template.
- Verify the generated HTML/plain-text output and confirm the project remains error-free.
