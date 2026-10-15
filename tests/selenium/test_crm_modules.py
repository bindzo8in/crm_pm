import os
import unittest
from dataclasses import dataclass
from urllib.parse import urljoin

from selenium import webdriver
from selenium.common.exceptions import TimeoutException
from selenium.webdriver.common.by import By
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait


BASE_URL = os.getenv("CRM_TEST_BASE_URL", "http://localhost:3000")
PASSWORD = os.getenv("CRM_TEST_PASSWORD", "")


@dataclass(frozen=True)
class TestAccount:
    role: str
    email: str


ACCOUNTS = [
    TestAccount("SUPER_ADMIN", os.getenv("CRM_TEST_SUPERADMIN_EMAIL", "")),
    TestAccount("ADMIN", os.getenv("CRM_TEST_ADMIN_EMAIL", "")),
    TestAccount("STAFF", os.getenv("CRM_TEST_STAFF_EMAIL", "")),
]

MODULE_ROUTES = [
    ("/dashboard", "dashboard"),
    ("/attendance", "attendance"),
    ("/dashboard/attendance", "attendance"),
    ("/dashboard/leaves", "leave"),
    ("/dashboard/holidays", "holiday"),
    ("/dashboard/users", "user"),
    ("/dashboard/customers", "customer"),
    ("/dashboard/services", "service"),
    ("/dashboard/services/packages", "package"),
    ("/dashboard/tariffs", "tariff"),
    ("/dashboard/terms", "term"),
    ("/dashboard/proposals", "proposal"),
    ("/dashboard/salary", "salary"),
    ("/dashboard/invoices", "invoice"),
    ("/dashboard/finance", "finance"),
    ("/dashboard/finance/expenses/create", "expense"),
    ("/dashboard/settings/business/company", "company"),
    ("/dashboard/settings/business/banks", "bank"),
]

ROLE_ROUTE_EXCLUSIONS = {
    "SUPER_ADMIN": set(),
    "ADMIN": {
        "/dashboard/settings/business/company",
        "/dashboard/settings/business/banks",
    },
    "STAFF": {
        "/dashboard/users",
        "/dashboard/holidays",
        "/dashboard/services",
        "/dashboard/services/packages",
        "/dashboard/terms",
        "/dashboard/settings/business/company",
        "/dashboard/settings/business/banks",
    },
}

ROLE_DEPARTMENTS = {
    "SUPER_ADMIN": "OPERATIONS",
    "ADMIN": "SALES",
    "STAFF": "DEVELOPMENT",
}


class CRMModuleSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        missing = [
            name
            for name, value in (
                ("CRM_TEST_PASSWORD", PASSWORD),
                ("CRM_TEST_SUPERADMIN_EMAIL", ACCOUNTS[0].email),
                ("CRM_TEST_ADMIN_EMAIL", ACCOUNTS[1].email),
                ("CRM_TEST_STAFF_EMAIL", ACCOUNTS[2].email),
            )
            if not value
        ]
        if missing:
            raise RuntimeError(f"Missing Selenium test configuration: {', '.join(missing)}")

        options = webdriver.ChromeOptions()
        if os.getenv("CRM_TEST_HEADLESS", "1") == "1":
            options.add_argument("--headless=new")
        options.add_argument("--window-size=1440,1000")
        cls.driver = webdriver.Chrome(options=options)
        cls.wait = WebDriverWait(cls.driver, 30)

    @classmethod
    def tearDownClass(cls):
        cls.driver.quit()

    def sign_in(self, account: TestAccount):
        self.driver.delete_all_cookies()
        self.driver.get(urljoin(BASE_URL, "/signin"))
        self.wait.until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "input[name='email']"))
        ).send_keys(account.email)
        self.driver.find_element(By.CSS_SELECTOR, "input[name='password']").send_keys(PASSWORD)
        self.driver.find_element(
            By.XPATH, "//button[normalize-space()='Submit']"
        ).click()
        self.wait.until(lambda driver: "/signin" not in driver.current_url)

    def load_module(self, path: str, marker: str):
        self.driver.get(urljoin(BASE_URL, path))

        if "/signin" in self.driver.current_url:
            self.fail(f"{path} redirected to sign in")

        try:
            self.wait.until(
                lambda driver: marker in driver.find_element(By.TAG_NAME, "body").text.lower()
                or "application error" in driver.find_element(By.TAG_NAME, "body").text.lower()
                or "internal server error" in driver.find_element(By.TAG_NAME, "body").text.lower()
            )
        except TimeoutException:
            self.fail(f"{path} never rendered its expected module marker: {marker}")

        body = self.driver.find_element(By.TAG_NAME, "body").text.lower()
        self.assertNotIn("application error: a server-side exception has occurred", body, path)
        self.assertNotIn("internal server error", body, path)
        self.assertIn(marker, body, f"{path} did not render expected marker '{marker}'")

    def test_sign_in_for_each_test_role(self):
        for account in ACCOUNTS:
            with self.subTest(role=account.role):
                self.sign_in(account)
                self.assertNotIn("/signin", self.driver.current_url)
                self.assertNotIn("invalid email or password", self.driver.page_source.lower())

    def test_auth_page_copy(self):
        self.driver.get(urljoin(BASE_URL, "/signin"))
        self.assertIn(
            "Sign in to access your account",
            self.driver.find_element(By.TAG_NAME, "body").text,
        )

        self.driver.get(urljoin(BASE_URL, "/forget-password"))
        self.assertIn(
            "Forgot Password",
            self.driver.find_element(By.TAG_NAME, "body").text,
        )

    def test_role_and_department_are_listed_for_admins(self):
        for account in ACCOUNTS[:2]:
            with self.subTest(role=account.role):
                self.sign_in(account)
                self.driver.get(urljoin(BASE_URL, "/dashboard/users"))
                self.wait.until(
                    lambda driver: account.email in driver.find_element(By.TAG_NAME, "body").text
                )
                body = self.driver.find_element(By.TAG_NAME, "body").text
                self.assertIn(account.role, body)
                self.assertIn(ROLE_DEPARTMENTS[account.role], body)

    def test_sidebar_items_follow_role_permissions(self):
        visible_items = {
            "SUPER_ADMIN": {
                "Dashboard",
                "Attendance",
                "Leaves",
                "Holidays",
                "Users",
                "Customers",
                "Services",
                "Packages",
                "Tariffs",
                "Terms",
                "Proposals",
                "Salary",
                "Invoice",
                "Finance",
                "Company Profile",
                "Bank Accounts",
            },
            "ADMIN": {
                "Dashboard",
                "Attendance",
                "Leaves",
                "Holidays",
                "Users",
                "Customers",
                "Services",
                "Packages",
                "Tariffs",
                "Terms",
                "Proposals",
                "Salary",
                "Invoice",
                "Finance",
            },
            "STAFF": {
                "Dashboard",
                "Attendance",
                "Leaves",
                "Customers",
                "Tariffs",
                "Proposals",
                "Salary",
                "Invoice",
            },
        }
        hidden_items = {
            "SUPER_ADMIN": set(),
            "ADMIN": {"Company Profile", "Bank Accounts"},
            "STAFF": {
                "Holidays",
                "Users",
                "Services",
                "Packages",
                "Terms",
                "Finance",
                "Company Profile",
                "Bank Accounts",
            },
        }

        for account in ACCOUNTS:
            with self.subTest(role=account.role):
                self.sign_in(account)
                self.driver.get(urljoin(BASE_URL, "/dashboard"))
                body = self.driver.find_element(By.TAG_NAME, "body")

                for item in visible_items[account.role]:
                    self.assertTrue(
                        body.find_elements(
                            By.XPATH,
                            f"//a[.//span[normalize-space()='{item}']]",
                        ),
                        f"{account.role} should see the {item} navigation item",
                    )

                for item in hidden_items[account.role]:
                    self.assertFalse(
                        body.find_elements(
                            By.XPATH,
                            f"//a[.//span[normalize-space()='{item}']]",
                        ),
                        f"{account.role} should not see the {item} navigation item",
                    )

                self.assertFalse(
                    body.find_elements(
                        By.XPATH,
                        "//a[.//span[normalize-space()='Analytics']]",
                    ),
                    "Analytics has no implemented destination and should not be shown",
                )

    def test_modules_load_for_each_allowed_role(self):
        for account in ACCOUNTS:
            with self.subTest(role=account.role):
                self.sign_in(account)
                excluded = ROLE_ROUTE_EXCLUSIONS[account.role]
                for path, marker in MODULE_ROUTES:
                    if path in excluded:
                        continue
                    with self.subTest(path=path):
                        self.load_module(path, marker)

    def test_admin_routes_restrict_settings(self):
        for account in ACCOUNTS[1:]:
            for path in (
                "/dashboard/settings/business/company",
                "/dashboard/settings/business/banks",
            ):
                with self.subTest(role=account.role, path=path):
                    self.sign_in(account)
                    self.driver.get(urljoin(BASE_URL, path))
                    self.wait.until(lambda driver: driver.current_url.rstrip("/").endswith("/dashboard"))
                    self.assertTrue(self.driver.current_url.rstrip("/").endswith("/dashboard"))

    def test_expense_form_has_consumer_and_attachment_controls(self):
        self.sign_in(ACCOUNTS[0])
        self.load_module("/dashboard/finance/expenses/create", "record an expense")
        self.assertTrue(
            self.driver.find_elements(By.XPATH, "//*[contains(normalize-space(), 'Consumer (optional)')]")
        )
        self.assertTrue(
            self.driver.find_elements(By.XPATH, "//button[contains(., 'Upload receipt')]")
        )
        self.driver.find_element(By.XPATH, "//button[contains(., 'New consumer')]").click()
        self.wait.until(
            EC.visibility_of_element_located(
                (By.XPATH, "//*[contains(normalize-space(), 'Create consumer')]")
            )
        )
        self.assertTrue(self.driver.find_elements(By.NAME, "displayName"))

    def test_finance_dashboard_sections(self):
        self.sign_in(ACCOUNTS[0])
        self.load_module("/dashboard/finance", "expenses and cash flow")
        body = self.driver.find_element(By.TAG_NAME, "body").text
        for section in ("Overview", "Transactions", "Accounts"):
            self.assertIn(section, body)

    def test_staff_finance_data_requires_permission(self):
        self.sign_in(ACCOUNTS[2])
        self.driver.get(urljoin(BASE_URL, "/dashboard/finance"))
        self.wait.until(
            lambda driver: "you do not have permission" in driver.find_element(
                By.TAG_NAME, "body"
            ).text.lower()
        )
        body = self.driver.find_element(By.TAG_NAME, "body").text.lower()
        self.assertIn("you do not have permission", body)

    def test_expense_form_fits_mobile_viewport(self):
        self.sign_in(ACCOUNTS[0])
        self.driver.set_window_size(390, 844)
        self.load_module("/dashboard/finance/expenses/create", "record an expense")
        dimensions = self.driver.execute_script(
            "return { viewport: window.innerWidth, content: document.documentElement.scrollWidth }"
        )
        self.assertLessEqual(
            dimensions["content"],
            dimensions["viewport"],
            "Expense form overflows horizontally on a mobile viewport",
        )
        self.driver.set_window_size(1440, 1000)


if __name__ == "__main__":
    unittest.main(verbosity=2)
