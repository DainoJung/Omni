# Brightside English Academy — Website

A polished, self-contained marketing website for a general all-ages English academy.
No build step, no dependencies — just open it in a browser.

## Structure

```
english-school-website/
├── index.html              # Single-page site (all sections)
├── assets/
│   ├── css/styles.css      # Styles + responsive layout
│   ├── js/main.js          # Nav, scroll reveal, counters, form validation
│   └── img/                # (place real images here)
└── README.md
```

## Sections

Header · Hero · Stats · Programs (Kids / Teens / Adults / Test Prep) ·
Why Us · Teachers · Testimonials · Pricing · FAQ · Contact form · Footer

## View it locally

Open `index.html` directly in a browser, or serve the folder:

```bash
cd english-school-website
python3 -m http.server 8000
# then visit http://localhost:8000
```

## Notes

- Fully responsive (desktop, tablet, mobile) with an accessible mobile menu.
- The contact form is front-end only (validation + success message). To make it
  send real submissions, wire the submit handler in `assets/js/main.js` to an
  email service, form backend, or Supabase table.
- Replace placeholder copy, contact details, and teacher info with real content.
