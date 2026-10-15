# CRM Selenium smoke tests

These tests use a running local CRM instance and three local Selenium test users:
one each for `SUPER_ADMIN`, `ADMIN`, and `STAFF`.

Install Selenium if needed:

```powershell
python -m pip install selenium
```

Set credentials in PowerShell and run the suite:

```powershell
$env:CRM_TEST_SUPERADMIN_EMAIL = "superadmin-test@example.test"
$env:CRM_TEST_ADMIN_EMAIL = "admin-test@example.test"
$env:CRM_TEST_STAFF_EMAIL = "staff-test@example.test"
$env:CRM_TEST_PASSWORD = "<shared test password>"
python -m unittest discover -s tests\selenium -p "test_*.py" -v
```

Optional settings:

- `CRM_TEST_BASE_URL` defaults to `http://localhost:3000`.
- `CRM_TEST_HEADLESS=0` runs Chrome visibly.

The suite checks sign-in, module route rendering, role and department visibility,
settings route restrictions, expense form controls and consumer dialog, finance
sections and staff finance permission handling, plus mobile horizontal overflow.
It does not create business records or upload files.
