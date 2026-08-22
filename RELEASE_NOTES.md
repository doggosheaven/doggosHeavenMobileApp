# Release notes

Paste the matching block into the store listing at submission time.
Play Store caps "What's new" at 500 characters; App Store has no hard cap but
keeps the first few lines visible, so the important items come first.

---

## 1.0.5 — Play Store ("What's new", 492 characters)

```
Manage your bookings the way you'd expect:

• Reschedule a booking instead of cancelling and starting over
• Download an invoice for any booking you've paid for
• Rate a service once it's done, and rebook it in one tap
• New Vaccinations screen — see what's due for each of your pets
• Full wallet history, with money in and money out
• We'll wish your pet a happy birthday on the day

Fixed
• Pet photos now save properly when you add or edit a pet
• Clearer messages when something can't load
```

## 1.0.5 — App Store ("What's New in This Version")

```
Manage your bookings the way you'd expect.

• Reschedule — move a booking to another day or time instead of cancelling and starting over.
• Invoices — download a receipt for any booking you've paid for, and share it straight from the app.
• Ratings — rate a service once it's completed, and rebook the same one in a single tap.
• Vaccinations — a new screen showing what's due for each of your pets, with anything overdue first.
• Wallet history — every recharge and charge, grouped by day, with totals.
• Birthdays — we'll wish your pet a happy birthday on the day.

Also fixed
• Pet photos now save properly when you add or edit a pet.
• When something can't load, the app now says so and offers to retry, instead of showing an empty screen.
```

---

## Notes for the reviewer (App Store Connect → App Review Information)

The app has a customer side and a staff side behind the same login. Reviewers
only need the customer side; a demo customer account should be supplied in the
review notes.

```
Doggos Heaven is a pet care service app for a single clinic in India.

Customers register their pets, book services (grooming, boarding, day care,
veterinary), pay through Razorpay, keep a wallet balance, and view their pets'
prescriptions and vaccination schedule.

The same app also serves the clinic's own staff and administrators, who sign in
with staff credentials issued by the business. Those areas are not reachable
with a customer account.

Demo customer account:
  email:    <fill in>
  password: <fill in>
```

---

## Internal changelog (not for the store)

- Bookings: reschedule, rate, and rebook.
- Customers: invoice download, vaccination schedule, full wallet ledger.
- Pets: photos a customer picked were being discarded by the API and are now stored.
- Walk-in billing: card and UPI payments failed with a 404 because the order
  endpoint did not exist; it does now, and it supplies the Razorpay key so the
  app no longer needs it in its build config.
- Staff can register walk-in customers; admins can create staff and customers,
  optionally with the customer's first pet, and email the sign-in details.
- New superadmin area: user management across all roles, revenue per person,
  and a system-wide overview.
- Sessions are re-checked against the server on launch, so a role change or a
  deactivation takes effect immediately rather than at the next sign-in.
- Loads that fail now say so and offer a retry instead of rendering blank.
- Calendars keep one size across months; long amounts no longer overflow cards.
