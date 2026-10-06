import { test, expect, type Locator, type Page } from "@playwright/test";
import type { Availability, Shift } from "../src/api/workflows";

const start = "2026-09-28";
const departments = [
  {
    id: 1,
    name: "Operations",
    locationId: 1,
    locationName: "Edmonton",
    archived: false,
  },
  {
    id: 2,
    name: "Customer care",
    locationId: 2,
    locationName: "Calgary",
    archived: false,
  },
];
const people = [
  "Alex Morgan",
  "Jamie Chen",
  "Priya Shah",
  "Sam Wilson",
  "Taylor Reed",
  "Jordan Lee",
].map((name, i) => ({
  id: i + 1,
  name,
  employeeNumber: `00000${i + 1}`,
  departmentId: i === 5 ? 2 : 1,
  active: true,
  self: false,
}));
const categories = [
  {
    id: 1,
    name: "Morning",
    color: "#5B4BE1",
    defaultStartTime: "09:00",
    defaultEndTime: "17:00",
    active: true,
  },
  {
    id: 2,
    name: "Evening",
    color: "#C47608",
    defaultStartTime: "14:00",
    defaultEndTime: "22:00",
    active: true,
  },
  {
    id: 3,
    name: "Night",
    color: "#167B80",
    defaultStartTime: "22:00",
    defaultEndTime: "06:00",
    active: true,
  },
];
const assignment = (id: number, employeeId: number, status = "ACCEPTED") => ({
  id,
  employeeId,
  status,
  version: 0,
});
const shifts: Shift[] = [
  {
    id: 10,
    shiftCategoryId: 1,
    categoryName: "Morning",
    departmentId: 1,
    locationId: 1,
    startsAt: "2026-09-28T09:00:00-06:00",
    endsAt: "2026-09-28T17:00:00-06:00",
    requiredEmployees: 3,
    status: "PUBLISHED",
    version: 0,
    assignments: [
      assignment(1, 1),
      assignment(2, 2),
      assignment(3, 3, "DECLINED"),
    ],
  },
  {
    id: 11,
    shiftCategoryId: 3,
    categoryName: "Night",
    departmentId: 1,
    locationId: 1,
    startsAt: "2026-09-28T22:00:00-06:00",
    endsAt: "2026-09-29T06:00:00-06:00",
    requiredEmployees: 1,
    status: "PUBLISHED",
    version: 0,
    assignments: [assignment(4, 1)],
  },
  {
    id: 12,
    shiftCategoryId: 2,
    categoryName: "Evening",
    departmentId: 1,
    locationId: 1,
    startsAt: "2026-09-29T14:00:00-06:00",
    endsAt: "2026-09-29T22:00:00-06:00",
    requiredEmployees: 1,
    status: "DRAFT",
    version: 0,
    assignments: [],
  },
  {
    id: 13,
    shiftCategoryId: 1,
    categoryName: "Morning",
    departmentId: 2,
    locationId: 2,
    startsAt: "2026-09-30T09:00:00-06:00",
    endsAt: "2026-09-30T17:00:00-06:00",
    requiredEmployees: 1,
    status: "PUBLISHED",
    version: 0,
    assignments: [assignment(5, 6)],
  },
  {
    id: 14,
    shiftCategoryId: 1,
    categoryName: "Morning",
    departmentId: 1,
    locationId: 1,
    startsAt: "2026-09-30T09:00:00-06:00",
    endsAt: "2026-09-30T17:00:00-06:00",
    requiredEmployees: 1,
    status: "CANCELLED",
    version: 0,
    assignments: [assignment(6, 1)],
  },
  ...[2, 3, 4].map(
    (offset): Shift => ({
      id: 20 + offset,
      shiftCategoryId: 1,
      categoryName: "Morning",
      departmentId: 1,
      locationId: 1,
      startsAt: `2026-${offset === 2 ? "09" : "10"}-${offset === 2 ? "30" : `0${offset - 2}`}T09:00:00-06:00`,
      endsAt: `2026-${offset === 2 ? "09" : "10"}-${offset === 2 ? "30" : `0${offset - 2}`}T17:00:00-06:00`,
      requiredEmployees: 2,
      status: "PUBLISHED",
      version: 0,
      assignments: [assignment(10 + offset, 3), assignment(20 + offset, 4)],
    }),
  ),
];

// Both ends now live in the same scrolling roster. Start the native drag before
// scrolling its destination into view, so the source cannot move under the mouse.
async function dragRosterEmployee(
  page: Page,
  employee: Locator,
  target: Locator,
) {
  await employee.scrollIntoViewIfNeeded();
  const source = (await employee.boundingBox())!;
  const x = source.x + source.width / 2;
  const y = source.y + source.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 20, y, { steps: 5 });
  await target.scrollIntoViewIfNeeded();
  const destination = (await target.boundingBox())!;
  await page.mouse.move(
    destination.x + destination.width / 2,
    destination.y + destination.height / 2,
    { steps: 10 },
  );
  await page.mouse.move(
    destination.x + destination.width / 2,
    destination.y + destination.height / 2,
  );
  await page.mouse.up();
}

async function fixture(page: Page, role = "MANAGER", directory = people) {
  const mutations: string[] = [];
  const requests: { path: string; body: Record<string, unknown> }[] = [];
  const rosterShifts = structuredClone(shifts);
  let availability: Availability[] = [];
  let nextId = 100;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      const method = route.request().method();
      const body =
        method !== "GET" ? (route.request().postDataJSON() ?? {}) : {};
      if (
        method !== "GET" &&
        !path.endsWith("/refresh") &&
        !path.endsWith("/assignment-preview")
      ) {
        mutations.push(path);
        requests.push({ path, body });
      }
      let data: unknown = [];
      if (path.endsWith("/csrf"))
        data = { token: "test", headerName: "X-XSRF-TOKEN" };
      else if (path.endsWith("/refresh"))
        data = { accessToken: "fixture-token" };
      else if (path === "/api/v1/accounts/me")
        data = {
          id: "account",
          email: "manager@example.test",
          role,
          status: "ACTIVE",
        };
      else if (path === "/api/shifts/options")
        data = {
          people: directory.map((p) => ({
            ...p,
            self: role === "EMPLOYEE" && p.id === 1,
          })),
          departments,
        };
      else if (path === "/api/shifts" && method === "POST") {
        const created: Shift = {
          id: nextId++,
          shiftCategoryId: Number(body.categoryId),
          categoryName: categories.find(
            (c) => c.id === Number(body.categoryId),
          )!.name,
          departmentId: Number(body.departmentId),
          locationId: Number(body.locationId),
          startsAt: String(body.startsAt),
          endsAt: String(body.endsAt),
          requiredEmployees: Number(body.requiredEmployees),
          status: "DRAFT",
          version: 0,
          assignments: [],
        };
        rosterShifts.push(created);
        data = created;
      } else if (path === "/api/shifts") data = rosterShifts;
      else if (path === "/api/shifts/assignment-preview")
        data = {
          state: "AVAILABLE",
          reasons: ["Within stated available hours; no scheduling conflicts."],
        };
      else if (path === "/api/availability/me") data = availability;
      else if (path === "/api/availability" && method === "POST") {
        const entry = { ...body, id: nextId++ } as Availability;
        availability.push(entry);
        data = entry;
      } else if (path.startsWith("/api/availability/")) {
        const id = Number(path.split("/").pop());
        if (method === "DELETE")
          availability = availability.filter((a) => a.id !== id);
        else {
          availability = availability.map((a) =>
            a.id === id ? ({ ...body, id } as Availability) : a,
          );
          data = availability.find((a) => a.id === id);
        }
      } else if (/\/api\/shifts\/\d+\/assign/.test(path)) {
        const shift = rosterShifts.find(
          (s) => s.id === Number(path.split("/")[3]),
        )!;
        shift.assignments.push({
          id: nextId++,
          employeeId: Number(body.employeeId),
          status: "ASSIGNED",
          version: 0,
        });
        shift.version++;
        data = shift;
      } else if (/\/api\/shift-assignments\/\d+\/cancel/.test(path)) {
        const assignmentId = Number(path.split("/")[3]);
        const shift = rosterShifts.find(s => s.assignments.some(a => a.id === assignmentId))!;
        const assignment = shift.assignments.find(a => a.id === assignmentId)!;
        assignment.status = "CANCELLED";
        assignment.version++;
        shift.version++;
        data = assignment;
      } else if (path === "/api/shift-categories") data = categories;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(data),
      });
    },
  );
  await page.goto(`/schedule?from=${start}`);
  return { mutations, requests, errors };
}

test("right-click uses copy paste edit and details while preserving shift confirmations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const { requests, errors } = await fixture(page);
  const shift = page
    .getByRole("row", { name: "Open coverage", exact: true })
    .getByRole("button", { name: /shift 12/ });
  await shift.click({ button: "right" });
  const menu = page.getByRole("menu", { name: "Evening · Shift 12 actions" });
  await expect(menu.getByRole("menuitem")).toHaveText([
    "Copy",
    /Paste/,
    /Delete/,
    "Edit",
    "Details",
  ]);
  await expect(
    menu.getByRole("menuitem", { name: "Edit", exact: true }),
  ).toBeEnabled();
  await expect(
    menu.getByRole("menuitem", { name: "Delete", exact: true }),
  ).toBeDisabled();
  await expect(
    menu.getByRole("menuitem", { name: "Paste", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: test.info().outputPath(`ems-right-click-${page.context().browser()!.browserType().name()}.png`),
    animations: "disabled",
  });
  expect(requests).toHaveLength(0);
  await menu.getByRole("menuitem", { name: "Edit", exact: true }).click();
  const edit = page.getByRole("dialog", { name: "Edit shift", exact: true });
  await expect(edit).toBeVisible();
  await edit.getByRole("button", { name: "Cancel", exact: true }).click();

  await shift.click({ button: "right" });
  await menu.getByRole("menuitem", { name: "Details", exact: true }).click();
  const details = page.getByRole("dialog", {
    name: "Shift details",
    exact: true,
  });
  await details
    .getByRole("button", { name: "Cancel shift", exact: true })
    .click();
  const cancel = page.getByRole("dialog", {
    name: "Cancel shift",
    exact: true,
  });
  await expect(cancel).toBeVisible();
  expect(requests).toHaveLength(0);
  await cancel.getByRole("button", { name: "Keep shift", exact: true }).click();
  await details
    .getByRole("button", { name: "Close shift details", exact: true })
    .click();
  await shift.click({ button: "right" });
  await menu.getByRole("menuitem", { name: "Copy", exact: true }).click();

  const day = page.getByRole("cell", {
    name: "Taylor Reed 2026-09-27",
    exact: true,
  });
  await day.click({ button: "right", position: { x: 8, y: 8 } });
  await page.getByRole("menuitem", { name: "Paste", exact: true }).click();
  const create = page.getByRole("dialog", {
    name: "Create and assign shift",
    exact: true,
  });
  await expect(create).toContainText("Assigning Taylor Reed");
  await expect(create.getByLabel("Start date", { exact: false })).toHaveValue(
    "2026-09-27",
  );
  await expect(create.getByLabel("Start time", { exact: false })).toHaveValue(
    "14:00:00",
  );
  await expect(
    create.getByRole("combobox", { name: "Shift category", exact: true }),
  ).toContainText("Evening");
  await create.getByRole("button", { name: "Cancel", exact: true }).click();
  expect(requests).toHaveLength(0);
  expect(errors).toEqual([]);
});

test("employee context menu respects role restrictions and supports keyboard details", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const { requests, errors } = await fixture(page, "EMPLOYEE");
  const shift = page
    .getByRole("row", { name: "Alex Morgan, 16h scheduled", exact: true })
    .getByRole("button", { name: /shift 10/ });
  await shift.focus();
  await page.keyboard.press("Shift+F10");
  const menu = page.getByRole("menu", { name: "Morning · Shift 10 actions" });
  await expect(
    menu.getByRole("menuitem", { name: "Copy", exact: true }),
  ).toBeFocused();
  for (const action of ["Paste", "Delete", "Edit"])
    await expect(
      menu.getByRole("menuitem", { name: action, exact: true }),
    ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(shift).toBeFocused();
  await shift.click({ button: "right" });
  await menu.getByRole("menuitem", { name: "Details", exact: true }).click();
  const details = page.getByRole("dialog", {
    name: "Shift details",
    exact: true,
  });
  await expect(details).toBeVisible();
  await expect(
    details.getByRole("button", { name: "Accept", exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(0);
  expect(errors).toEqual([]);
});

test("pasting a published overnight shift creates a new draft without copying assignments", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const { requests, errors } = await fixture(page);
  const original = page
    .getByRole("row", { name: "Alex Morgan, 16h scheduled", exact: true })
    .getByRole("button", { name: /shift 11/ })
    .first();
  await original.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Copy", exact: true }).click();
  const destination = page.getByRole("cell", {
    name: "Open coverage 2026-10-02",
    exact: true,
  });
  await destination.click({ button: "right", position: { x: 8, y: 8 } });
  await page.getByRole("menuitem", { name: "Paste", exact: true }).click();
  const create = page.getByRole("dialog", {
    name: "Create shift",
    exact: true,
  });
  await expect(create.getByLabel("Start date", { exact: false })).toHaveValue(
    "2026-10-02",
  );
  await expect(create.getByLabel("End date", { exact: false })).toHaveValue(
    "2026-10-03",
  );
  expect(requests).toHaveLength(0);
  await create
    .getByRole("button", { name: "Create shift", exact: true })
    .click();
  await expect(create).toHaveCount(0);
  const body = requests.find((r) => r.path === "/api/shifts")!.body;
  expect(body).toMatchObject({
    categoryId: 3,
    departmentId: 1,
    requiredEmployees: 1,
    startsAt: "2026-10-03T04:00:00.000Z",
    endsAt: "2026-10-03T12:00:00.000Z",
  });
  for (const field of ["id", "version", "status", "assignments", "employeeId"])
    expect(body).not.toHaveProperty(field);
  await expect(
    destination.getByRole("button", { name: /shift 100/ }),
  ).toContainText("Draft");
  await expect(
    page.getByRole("row", { name: "Alex Morgan, 16h scheduled", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("availability context menu copies to another day and requires confirmation to delete", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const { requests, errors } = await fixture(page, "EMPLOYEE");
  await page.getByRole("tab", { name: "My availability" }).click();
  await page
    .getByRole("button", { name: "Add availability", exact: true })
    .click();
  const add = page.getByRole("dialog", {
    name: "Add availability",
    exact: true,
  });
  await add
    .getByRole("button", { name: "Add availability", exact: true })
    .click();
  await expect(add).toHaveCount(0);
  const saturday = page.getByRole("button", {
    name: "Saturday available 09:00–17:00",
    exact: true,
  });
  await saturday.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Details", exact: true }).click();
  const details = page.getByRole("dialog", {
    name: "Availability details",
    exact: true,
  });
  await expect(details).toContainText("Saturday");
  await expect(details).toContainText("09:00");
  await details.getByRole("button", { name: "Close", exact: true }).click();
  await saturday.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Copy", exact: true }).click();
  await page
    .locator('[data-availability-day="SUNDAY"]')
    .click({ button: "right", position: { x: 30, y: 9 * 52 + 8 } });
  await page.getByRole("menuitem", { name: "Paste", exact: true }).click();
  await expect(
    add.getByRole("combobox", { name: "Day", exact: true }),
  ).toContainText("Sunday");
  await expect(add.getByLabel("Start time", { exact: false })).toHaveValue(
    "09:00",
  );
  expect(requests.filter((r) => r.path === "/api/availability")).toHaveLength(
    1,
  );
  await add
    .getByRole("button", { name: "Add availability", exact: true })
    .click();
  await expect(add).toHaveCount(0);
  const sunday = page.getByRole("button", {
    name: "Sunday available 09:00–17:00",
    exact: true,
  });
  await sunday.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  const remove = page.getByRole("dialog", {
    name: "Delete availability",
    exact: true,
  });
  await expect(remove).toContainText("Sunday");
  expect(
    requests.filter((r) => r.path.startsWith("/api/availability/")),
  ).toHaveLength(0);
  await remove.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(sunday).toBeVisible();
  await sunday.click({ button: "right" });
  await page.getByRole("menuitem", { name: "Delete", exact: true }).click();
  await remove
    .getByRole("button", { name: "Delete availability", exact: true })
    .click();
  await expect(remove).toHaveCount(0);
  await expect(sunday).toHaveCount(0);
  await expect(saturday).toBeVisible();
  expect(
    requests.filter((r) => r.path.startsWith("/api/availability/")),
  ).toHaveLength(1);
  expect(errors).toEqual([]);
});

test("mobile weekly grid scrolls horizontally, pins names and restores drawer focus", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  const { errors } = await fixture(page);
  const scroll = page.getByRole("region", { name: "Scrollable weekly roster", exact: true });
  await expect(page.getByRole("table", { name: "Employee weekly roster" })).toBeVisible();
  const rowHeader = page.getByRole("row", { name: "Alex Morgan, 16h scheduled", exact: true }).getByRole("rowheader");
  const before = await rowHeader.boundingBox();
  await scroll.evaluate(el => { el.scrollLeft = 550; });
  await expect.poll(() => scroll.evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
  const after = await rowHeader.boundingBox();
  expect(Math.abs(before!.x - after!.x)).toBeLessThan(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: test.info().outputPath("ems-schedule-mobile.png"), fullPage: true, animations: "disabled" });
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  const filters = page.getByRole("dialog", { name: "Schedule filters" });
  await filters.getByRole("checkbox", { name: "Night", exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Filters (1)", exact: true })).toBeFocused();
  const continuation = page.getByRole("cell", { name: "Alex Morgan 2026-09-29", exact: true }).getByRole("button", { name: /shift 11/ });
  await continuation.scrollIntoViewIfNeeded();
  await expect(continuation).toContainText("Continues from previous day");
  await continuation.click();
  await expect(page.getByRole("dialog", { name: "Shift details" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(continuation).toBeFocused();
  for (const width of [320, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  expect(errors).toEqual([]);
});


test("employee cannot see planner actions and linked shifts open details", async ({
  page,
}) => {
  await fixture(page, "EMPLOYEE");
  await expect(
    page.getByRole("button", { name: "Create shift", exact: true }),
  ).toHaveCount(0);
  await page.goto(`/schedule?from=${start}&shift=10`);
  const details = page.getByRole("dialog", { name: "Shift details" });
  await expect(details).toBeVisible();
  await expect(
    details.getByRole("button", { name: "Assign employee" }),
  ).toHaveCount(0);
  await expect(
    details.getByRole("button", { name: "Cancel shift" }),
  ).toHaveCount(0);
  await expect(
    details.getByRole("button", { name: "Accept", exact: true }),
  ).toBeVisible();
  await expect(
    details.getByRole("button", { name: "Decline", exact: true }),
  ).toBeVisible();
});

test("availability hourly grid draws, moves, resizes and persists weekday-only blocks", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  const { requests, errors } = await fixture(page, "EMPLOYEE");
  await page.getByRole("tab", { name: "My availability" }).click();
  const grid = page.getByLabel("Weekly availability calendar");
  await expect(grid.getByText("Saturday", { exact: true })).toBeVisible();
  await expect(grid.getByText("Friday", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Week of")).toHaveCount(0);
  const saturday = await page
    .locator('[data-availability-day="SATURDAY"]')
    .boundingBox();
  const sunday = await page
    .locator('[data-availability-day="SUNDAY"]')
    .boundingBox();
  const y = saturday!.y + 9 * 52;
  await page.mouse.move(saturday!.x + saturday!.width / 2, y);
  await page.mouse.down();
  await page.mouse.move(saturday!.x + saturday!.width / 2, y + 2 * 52, {
    steps: 8,
  });
  await page.mouse.up();
  let card = page.getByRole("button", {
    name: "Saturday available 09:00–11:00",
    exact: true,
  });
  await expect(card).toBeVisible();
  await expect
    .poll(() => requests.filter((r) => r.path === "/api/availability").length)
    .toBe(1);
  const bounds = await card.boundingBox();
  await page.mouse.move(bounds!.x + bounds!.width / 2, bounds!.y + 35);
  await page.mouse.down();
  await page.mouse.move(sunday!.x + sunday!.width / 2, bounds!.y + 35, {
    steps: 8,
  });
  await page.mouse.up();
  card = page.getByRole("button", {
    name: "Sunday available 09:00–11:00",
    exact: true,
  });
  await expect(card).toBeVisible();
  const handle = await page
    .getByRole("slider", { name: "Resize end of Sunday available block" })
    .boundingBox();
  await page.mouse.move(
    handle!.x + handle!.width / 2,
    handle!.y + handle!.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handle!.x + handle!.width / 2,
    handle!.y + handle!.height / 2 + 52,
    { steps: 8 },
  );
  await page.mouse.up();
  card = page.getByRole("button", {
    name: "Sunday available 09:00–12:00",
    exact: true,
  });
  await expect(card).toBeVisible();
  await card.focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("button", {
      name: "Monday available 09:00–12:00",
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("ems-availability-hourly.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.reload();
  await page.getByRole("tab", { name: "My availability" }).click();
  await expect(
    page.getByRole("button", {
      name: "Monday available 09:00–12:00",
      exact: true,
    }),
  ).toBeVisible();
  await page.setViewportSize({ width: 375, height: 900 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Add availability" }).click();
  await expect(
    page.getByRole("dialog", { name: "Add availability" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("planner drops an employee onto a shift and an empty day, with warning and blocking feedback", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1200 });
  const { requests, errors } = await fixture(page);
  await page.getByRole("button", { name: "Choose schedule date", exact: true }).click();
  await expect(page.getByLabel("Week of")).toHaveValue("2026-09-26");
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page.route("**/api/shifts/assignment-preview", async (route) => {
    const body = route.request().postDataJSON();
    const state =
      body.shiftId === 10
        ? "BLOCKED"
        : body.shiftId === 12
          ? "WARNING"
          : "AVAILABLE";
    const reasons = [
      state === "BLOCKED"
        ? "Employee has approved or processing PTO on these dates"
        : state === "WARNING"
          ? "This shift falls outside the employee's stated available hours."
          : "Within stated available hours; no scheduling conflicts.",
    ];
    await route.fulfill({ json: { state, reasons } });
  });
  const employee = page.getByRole("button", {
    name: "Select Taylor Reed for scheduling",
  });
  await employee.click();
  const shift = page
    .getByRole("row", { name: "Open coverage", exact: true })
    .getByRole("button", { name: /shift 12/ });
  await expect(shift).toContainText("Availability warning");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath("ems-schedule-drag-feedback.png"),
    fullPage: true,
    animations: "disabled",
  });
  await dragRosterEmployee(page, employee, shift);
  const dialog = page.getByRole("dialog", {
    name: "Assign employee",
    exact: true,
  });
  await expect(dialog).toContainText("Taylor Reed");
  await expect(dialog).toContainText("falls outside");
  expect(requests.filter((r) => r.path.endsWith("/assign"))).toHaveLength(0);
  await dialog
    .getByRole("button", { name: "Assign employee", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  expect(
    requests.find((r) => r.path === "/api/shifts/12/assign")?.body.employeeId,
  ).toBe(5);
  const blocked = page
    .getByRole("row", { name: "Alex Morgan, 16h scheduled", exact: true })
    .getByRole("button", { name: /shift 10/ })
    .first();
  await expect(blocked).toContainText("Blocked");
  await dragRosterEmployee(page, employee, blocked);
  await expect(blocked).toContainText("approved or processing PTO");
  expect(requests.filter(r => r.path.endsWith("/assign"))).toHaveLength(1);
  await expect(
    page.getByRole("dialog", { name: "Assign employee" }),
  ).toHaveCount(0);
  await dragRosterEmployee(
    page,
    employee,
    page.getByRole("cell", { name: "Open coverage 2026-09-27", exact: true }),
  );
  const create = page.getByRole("dialog", { name: "Create and assign shift" });
  await expect(create).toContainText("Assigning Taylor Reed");
  await expect(
    create.getByRole("combobox", { name: "Department and location" }),
  ).toContainText("Operations");
  await expect(create).toContainText("Within stated available hours");
  await create.getByRole("button", { name: "Create and assign shift" }).click();
  await expect(create).toHaveCount(0);
  const newShift = requests.find(
    (r) => r.path === "/api/shifts/with-assignment",
  )!;
  expect(newShift.body.employeeId).toBe(5);
  expect((newShift.body.shift as Record<string, unknown>).startsAt).toContain(
    "2026-09-27",
  );
  expect(errors).toEqual([]);
});

test("supervisor can select employees on mobile and preview failures prevent assignment", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 900 });
  const { requests, errors } = await fixture(page, "SUPERVISOR");
  await page.route("**/api/shifts/assignment-preview", (route) =>
    route.fulfill({
      status: 503,
      json: { message: "Scheduling service unavailable" },
    }),
  );
  await page
    .getByRole("button", { name: "Select Taylor Reed for scheduling" })
    .click();
  await page.getByRole("row", { name: "Open coverage", exact: true }).getByRole("button", { name: /shift 12/ }).click();
  const details = page.getByRole("dialog", { name: "Shift details" });
  const row = details.getByRole("row").filter({ hasText: "Taylor Reed" });
  await expect(row).toContainText("Check failed");
  await expect(row.getByRole("button", { name: "Assign", exact: true })).toBeDisabled();
  await row.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(row).toContainText("Check failed");
  expect(requests.filter((r) => r.path.endsWith("/assign"))).toHaveLength(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});

test("employee rows replace the separate panel and empty day clicks prefill assignment", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const { requests, errors } = await fixture(page);
  const table = page.getByRole("table", { name: "Employee weekly roster" });
  await expect(table).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Staffing summary" })).toBeVisible();
  const taylor = page.getByRole("row", {
    name: "Taylor Reed, 0h scheduled",
    exact: true,
  });
  await taylor
    .getByRole("button", {
      name: "Select Taylor Reed for scheduling",
      exact: true,
    })
    .click();
  await expect(taylor).toHaveAttribute("aria-selected", "true");
  await expect(
    page
      .getByRole("row", { name: "Open coverage", exact: true })
      .getByRole("button", { name: /shift 12/ }),
  ).toContainText("Available");
  const day = taylor.getByRole("cell", {
    name: "Taylor Reed 2026-09-27",
    exact: true,
  });
  await day.click({ position: { x: 8, y: 8 } });
  const create = page.getByRole("dialog", {
    name: "Create and assign shift",
    exact: true,
  });
  await expect(create).toContainText("Assigning Taylor Reed");
  await expect(create.getByLabel("Start date", { exact: false })).toHaveValue(
    "2026-09-27",
  );
  await create.getByRole("button", { name: "Cancel", exact: true }).click();
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  const jamie = page.getByRole("row", {
    name: "Jamie Chen, 8h scheduled",
    exact: true,
  });
  await jamie
    .getByRole("button", {
      name: "Create shift for Jamie Chen on 2026-09-27",
      exact: true,
    })
    .focus();
  await page.keyboard.press("Enter");
  await expect(create).toContainText("Assigning Jamie Chen");
  await create.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Schedule filters", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close filters", exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: test.info().outputPath(`ems-schedule-row-assignment-${page.context().browser()!.browserType().name()}.png`),
    fullPage: true,
    animations: "disabled",
  });
  expect(
    requests.filter(
      (r) =>
        r.path === "/api/shifts/with-assignment" || r.path.endsWith("/assign"),
    ),
  ).toHaveLength(0);
  expect(errors).toEqual([]);
});


test("staffing summary follows filters and reviews shifts without writing data", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1200 });
  const { requests, errors } = await fixture(page);
  const summary = page.getByRole("complementary", { name: "Staffing summary" });
  await expect(summary).toContainText("10 of 12 positions staffed");
  await page.screenshot({ path: test.info().outputPath("ems-schedule-refined.png"), fullPage: true, animations: "disabled" });
  await expect(summary.getByRole("button", { name: "Review Evening shift 12" })).toBeVisible();
  await summary.getByRole("button", { name: "Review Evening shift 12" }).click();
  await expect(page.getByRole("dialog", { name: "Shift details" })).toContainText("Shift 12");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("checkbox", { name: "Night", exact: true }).check();
  await page.keyboard.press("Escape");
  await expect(summary).toContainText("1 of 1 positions staffed");
  await expect(summary).toContainText("All shifts are published and staffed.");
  await page.getByRole("button", { name: "Staffing summary", exact: true }).click();
  await expect(summary).toHaveCount(0);
  await page.getByRole("button", { name: "Staffing summary", exact: true }).click();
  await expect(summary).toBeVisible();
  expect(requests).toHaveLength(0);
  expect(errors).toEqual([]);
});


test("shift modal filters location staff, pins assignments, and assigns immediately", async ({ page }) => {
  const { requests, errors } = await fixture(page);
  await page.goto(`/schedule?from=${start}&shift=10`);
  const details = page.getByRole("dialog", { name: "Shift details", exact: true });
  await expect(details.getByRole("table", { name: "Shift staff" })).toBeVisible();
  await expect(details).toContainText("2 of 3 assigned · 1 needed");
  await expect(details.getByRole("row").filter({ hasText: "Jordan Lee" })).toHaveCount(0);
  await details.getByRole("combobox", { name: "Staff location" }).click();
  await page.getByRole("option", { name: "Calgary", exact: true }).click();
  await expect(details.getByRole("row").filter({ hasText: "Alex Morgan" })).toBeVisible();
  const jordan = details.getByRole("row").filter({ hasText: "Jordan Lee" });
  await expect(jordan).toContainText("Different department");
  await expect(jordan.getByRole("button", { name: "Assign", exact: true })).toBeDisabled();
  await details.getByRole("combobox", { name: "Staff location" }).click();
  await page.getByRole("option", { name: "Edmonton", exact: true }).click();
  const sam = details.getByRole("row").filter({ hasText: "Sam Wilson" });
  await expect(sam).toContainText("Available");
  await sam.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(sam.getByRole("button", { name: "Remove", exact: true })).toBeVisible();
  await expect(details).toContainText("3 of 3 assigned · 0 needed");
  expect(requests.filter(r => r.path === "/api/shifts/10/assign")).toHaveLength(1);
  await sam.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(details).toContainText("2 of 3 assigned · 1 needed");
  await expect(sam).toContainText("Cancelled");
  await page.screenshot({ path: test.info().outputPath("shift-details-modal.png"), animations: "disabled" });
  expect(errors).toEqual([]);
});

test("staff warnings require explicit override and conflicts cannot be assigned", async ({ page }) => {
  const { requests } = await fixture(page);
  await page.route("**/api/shifts/assignment-preview", route => route.fulfill({ json: route.request().postDataJSON().employeeId === 4
    ? { state: "WARNING", reasons: ["Outside preferred hours"] }
    : { state: "BLOCKED", reasons: ["Overlapping shift"] } }));
  await page.goto(`/schedule?from=${start}&shift=10`);
  const details = page.getByRole("dialog", { name: "Shift details", exact: true });
  const sam = details.getByRole("row").filter({ hasText: "Sam Wilson" });
  const taylor = details.getByRole("row").filter({ hasText: "Taylor Reed" });
  await expect(taylor).toContainText("Overlapping shift");
  await expect(taylor.getByRole("button", { name: "Assign", exact: true })).toBeDisabled();
  await sam.getByRole("button", { name: "Assign", exact: true }).click();
  await expect(details).toContainText("Select “Assign anyway” to proceed.");
  expect(requests.filter(r => r.path.endsWith("/assign"))).toHaveLength(0);
  await sam.getByRole("button", { name: "Assign anyway", exact: true }).click();
  await expect(sam.getByRole("button", { name: "Remove", exact: true })).toBeVisible();
  expect(requests.filter(r => r.path.endsWith("/assign"))).toHaveLength(1);
});
