import AppearanceControl from "../components/layout/AppearanceControl";
import { StatusGroups } from "../components/ui/StatusGroups";
import { workGroup } from "../components/ui/statusGrouping";
import { useState, type FormEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Paper,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import { Link, useLocation } from "react-router-dom";
import {
  canSubmit,
  demoHires,
  invitationExpired,
  organizationLogin,
  sevenDaysFrom,
  statusLabels,
  type DemoHire,
  type PersonalDetails,
} from "../features/onboarding/prototype";

const emptyInvite = {
  firstName: "",
  lastName: "",
  personalEmail: "",
  phone: "",
  department: "",
  jobTitle: "",
  startDate: "",
};
const panel = {
  p: 2,
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
};
const dateLabel = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Edmonton",
  }).format(new Date(value));

function EmployeeExperience({
  hire,
  onUpdate,
  onMessage,
}: {
  hire: DemoHire;
  onUpdate: (hire: DemoHire) => void;
  onMessage: (message: string) => void;
}) {
  const [personal, setPersonal] = useState<PersonalDetails>({
    ...hire.personal,
  });
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [termsOpen, setTermsOpen] = useState(false);
  const expired =
    hire.status === "INVITED" && invitationExpired(hire, new Date());
  const editable = ["IN_PROGRESS", "CHANGES_REQUESTED"].includes(hire.status);
  const step =
    hire.status === "INVITED"
      ? 0
      : editable
        ? 1
        : hire.status === "SUBMITTED"
          ? 2
          : 3;
  function setup(event: FormEvent) {
    event.preventDefault();
    if (expired || hire.status !== "INVITED") return;
    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)\S{12,72}$/.test(password) ||
      new TextEncoder().encode(password).length > 72
    ) {
      setError(
        "Use 12–72 characters with uppercase, lowercase and a number, within 72 UTF-8 bytes.",
      );
      return;
    }
    if (password !== confirmation) {
      setError("Passwords must match.");
      return;
    }
    setPassword("");
    setConfirmation("");
    setError("");
    onUpdate({ ...hire, status: "IN_PROGRESS" });
    onMessage("Demo account setup complete. No account or password was saved.");
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!editable) return;
    if (!canSubmit(personal)) {
      setError(
        "Complete your name, phone, address and terms acceptance before submitting.",
      );
      return;
    }
    onUpdate({
      ...hire,
      personal: {
        ...personal,
        firstName: personal.firstName.trim(),
        lastName: personal.lastName.trim(),
        phone: personal.phone.trim(),
        address: personal.address.trim(),
      },
      status: "SUBMITTED",
    });
    setError("");
    onMessage("Demo package submitted for manager or admin approval.");
  }
  const field = (
    name: "firstName" | "lastName" | "phone" | "address",
    label: string,
    maxLength: number,
  ) => (
    <TextField
      required
      fullWidth
      label={label}
      value={personal[name]}
      onChange={(event) =>
        setPersonal({ ...personal, [name]: event.target.value })
      }
      slotProps={{ htmlInput: { maxLength } }}
    />
  );
  return (
    <Paper sx={panel}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h3">
            Welcome, {hire.personal.firstName}
          </Typography>
          <Typography color="text.secondary">
            {hire.jobTitle} · {hire.department} · Start date: {hire.startDate}
          </Typography>
        </Box>
        {hire.status === "CANCELLED" ? (
          <Alert severity="warning">
            This invitation was cancelled. Contact your hiring manager.
          </Alert>
        ) : (
          <>
            <Stepper
              activeStep={step}
              alternativeLabel
              sx={{ "& .MuiStepLabel-label": { fontSize: 12 } }}
            >
              {[
                "Set up account",
                "Personal details & terms",
                "Manager review",
                "Ready for work",
              ].map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            {error && <Alert severity="error">{error}</Alert>}
            {hire.status === "INVITED" &&
              (expired ? (
                <Alert severity="warning">
                  This setup invitation expired. Ask a manager or admin to
                  resend it.
                </Alert>
              ) : (
                <Box component="form" onSubmit={setup}>
                  <Stack spacing={2}>
                    <Typography variant="h3">Choose your password</Typography>
                    <Typography variant="body2">
                      Your organization login is{" "}
                      <strong>{hire.organizationLogin}</strong>. This is an EMS
                      login; a mailbox is not created.
                    </Typography>
                    <TextField
                      label="New password"
                      type="password"
                      required
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      autoComplete="new-password"
                      helperText="For this preview, use a made-up password. 12–72 characters, uppercase, lowercase and a number."
                      slotProps={{
                        htmlInput: { minLength: 12, maxLength: 72 },
                      }}
                    />
                    <TextField
                      label="Confirm password"
                      type="password"
                      required
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      autoComplete="new-password"
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      sx={{ alignSelf: "flex-start" }}
                    >
                      Set up demo account
                    </Button>
                  </Stack>
                </Box>
              ))}
            {editable && (
              <Box component="form" onSubmit={submit}>
                <Stack spacing={2}>
                  {hire.status === "CHANGES_REQUESTED" && (
                    <Alert severity="warning">
                      Changes requested: {hire.feedback}
                    </Alert>
                  )}
                  <Typography variant="h3">Review your details</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Your manager filled in the basics. Check your information
                    and add your address.
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                    {field("firstName", "First name", 50)}
                    {field("lastName", "Last name", 50)}
                  </Stack>
                  {field("phone", "Phone number", 40)}
                  {field("address", "Home address", 500)}
                  <Typography variant="body2">
                    Invitation sent to: {hire.personalEmail}
                  </Typography>
                  <Divider />
                  <Typography variant="h3">Terms</Typography>
                  <Button
                    onClick={() => setTermsOpen(true)}
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Read demo terms
                  </Button>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={personal.termsAccepted}
                        onChange={(event) =>
                          setPersonal({
                            ...personal,
                            termsAccepted: event.target.checked,
                          })
                        }
                      />
                    }
                    label="I have read and accept the demo onboarding terms"
                  />
                  <Alert severity="info">
                    Banking, tax and SIN details can be completed later.
                    Contract signing is deferred.
                  </Alert>
                  <Stack
                    direction="row"
                    spacing={1}
                    useFlexGap
                    sx={{ flexWrap: "wrap" }}
                  >
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => {
                        onUpdate({ ...hire, personal });
                        onMessage("Demo draft saved for this page session.");
                      }}
                    >
                      Save draft
                    </Button>
                    <Button type="submit" variant="contained">
                      Submit for approval
                    </Button>
                  </Stack>
                </Stack>
              </Box>
            )}
            {hire.status === "SUBMITTED" && (
              <Alert severity="info">
                Your onboarding is awaiting approval. Scheduling, attendance and
                time off become available after a manager or admin approves it.
              </Alert>
            )}
            {hire.status === "COMPLETED" && (
              <>
                <Alert severity="success">
                  Onboarding approved. In the full implementation, your
                  workforce access would now be available.
                </Alert>
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: "wrap" }}
                >
                  {["Scheduling", "Attendance", "Time off"].map((label) => (
                    <Chip
                      key={label}
                      label={`${label} · Ready in demo`}
                      color="success"
                      variant="outlined"
                    />
                  ))}
                </Stack>
                <Typography variant="body2">
                  Banking, tax and SIN details remain a later payroll task.
                  Contract signing is deferred.
                </Typography>
              </>
            )}
          </>
        )}
        <Dialog
          open={termsOpen}
          onClose={() => setTermsOpen(false)}
          fullWidth
          maxWidth="sm"
        >
          <DialogTitle>Demo onboarding terms</DialogTitle>
          <DialogContent>
            <Typography>
              These placeholder terms are for reviewing the onboarding
              experience. In this demo, you confirm that you reviewed your
              personal details and understand that a manager or admin will
              review your submission. The production flow will show your
              organization's approved terms and record the version you accepted.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setTermsOpen(false)}>Close terms</Button>
          </DialogActions>
        </Dialog>
      </Stack>
    </Paper>
  );
}

export default function OnboardingPreviewPage() {
  const publicPreview = useLocation().pathname === "/onboarding-preview";
  const [hires, setHires] = useState(() => demoHires(new Date()));
  const [selectedId, setSelectedId] = useState("demo-invited");
  const [view, setView] = useState("manager");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ ...emptyInvite });
  const [notice, setNotice] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [emailOpen, setEmailOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const hire = hires.find((item) => item.id === selectedId)!;
  const update = (next: DemoHire) =>
    setHires((previous) =>
      previous.map((item) => (item.id === next.id ? next : item)),
    );
  function select(id: string) {
    setSelectedId(id);
    setFeedback("");
    setReviewError("");
    setNotice("");
  }
  function createInvite(event: FormEvent) {
    event.preventDefault();
    const values = Object.fromEntries(
      Object.entries(invite).map(([key, value]) => [key, value.trim()]),
    ) as typeof invite;
    if (Object.values(values).some((value) => !value)) {
      setInviteError("Complete all invitation fields.");
      return;
    }
    if (
      hires.some(
        (item) =>
          item.status !== "CANCELLED" &&
          item.personalEmail.toLowerCase() ===
            values.personalEmail.toLowerCase(),
      )
    ) {
      setInviteError(
        "An onboarding record already uses that personal email. Select it to resend its invitation.",
      );
      return;
    }
    const now = new Date();
    const newHire: DemoHire = {
      id: crypto.randomUUID(),
      personalEmail: values.personalEmail.toLowerCase(),
      organizationLogin: organizationLogin(
        values.firstName,
        values.lastName,
        hires,
      ),
      department: values.department,
      jobTitle: values.jobTitle,
      startDate: values.startDate,
      status: "INVITED",
      invitedAt: now.toISOString(),
      expiresAt: sevenDaysFrom(now),
      personal: {
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        address: "",
        termsAccepted: false,
      },
      feedback: "",
    };
    setHires((previous) => [newHire, ...previous]);
    select(newHire.id);
    setInviteOpen(false);
    setInvite({ ...emptyInvite });
    setInviteError("");
    setNotice(
      "Demo invitation created. No email was sent. Preview the invitation or open the employee view to continue.",
    );
  }
  const counts = [
    {
      label: "Invited",
      count: hires.filter((item) => item.status === "INVITED").length,
    },
    {
      label: "In progress",
      count: hires.filter((item) =>
        ["IN_PROGRESS", "CHANGES_REQUESTED"].includes(item.status),
      ).length,
    },
    {
      label: "Awaiting approval",
      count: hires.filter((item) => item.status === "SUBMITTED").length,
    },
    {
      label: "Completed",
      count: hires.filter((item) => item.status === "COMPLETED").length,
    },
  ];
  const inviteField = (
    name: keyof typeof emptyInvite,
    label: string,
    type = "text",
    maxLength = 100,
  ) => (
    <TextField
      fullWidth
      required
      label={label}
      type={type}
      value={invite[name]}
      onChange={(event) => setInvite({ ...invite, [name]: event.target.value })}
      slotProps={{
        htmlInput: { maxLength },
        ...(type === "date" ? { inputLabel: { shrink: true } } : {}),
      }}
    />
  );
  return (
    <Box sx={{ maxWidth: 1280, mx: "auto", p: publicPreview ? { xs: 2, md: 3 } : 0 }}>
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
        >
          <Box>
            <Typography variant="overline" color="primary">
              People / New hires
            </Typography>
            <Typography variant="h1">A smoother start</Typography>
            <Typography color="text.secondary">
              Invite your new hire. Let them finish the details. Approve their
              access.
            </Typography>
          </Box>
          <Stack direction="row" sx={{ alignItems: "center" }}>{publicPreview && <AppearanceControl />}<Button component={Link} to="/dashboard" variant="text">
            Back to EMS
          </Button></Stack>
        </Stack>
        <Alert severity="info">
          Interactive prototype · Sample data lives only in this page session
          and resets on reload. No emails, accounts, employee records or
          workforce permissions are changed. Use fictional details.
        </Alert>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
            gap: 2,
          }}
        >
          {counts.map((item) => (
            <Paper key={item.label} sx={{ ...panel, p: 2 }}>
              <Typography variant="body2" color="text.secondary">
                {item.label}
              </Typography>
              <Typography variant="h2" component="p" sx={{ mt: 1 }}>
                {item.count}
              </Typography>
            </Paper>
          ))}
        </Box>
        <Tabs
          value={view}
          onChange={(_, next: string) => {
            setView(next);
            setNotice("");
          }}
          aria-label="Prototype perspective"
        >
          <Tab value="manager" label="Manager / admin view" />
          <Tab value="employee" label="Employee view" />
        </Tabs>
        {notice && (
          <Alert severity="success" role="status" onClose={() => setNotice("")}>
            {notice}
          </Alert>
        )}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: "320px minmax(0, 1fr)" },
            gap: 3,
            alignItems: "start",
          }}
        >
          <Paper sx={panel}>
            <Stack spacing={2}>
              <Stack
                direction="row"
                sx={{ justifyContent: "space-between", alignItems: "center" }}
              >
                <Typography variant="h3">New hires</Typography>
                <Chip size="small" label={`${hires.length} demo records`} />
              </Stack>
              {view === "manager" && (
                <Button
                  variant="contained"
                  startIcon={<PersonAddAltRoundedIcon />}
                  onClick={() => {
                    setInviteError("");
                    setInviteOpen(true);
                  }}
                >
                  Invite new hire
                </Button>
              )}
              <Typography variant="caption" color="text.secondary">
                Select a sample hire to walk through their onboarding.
              </Typography>
              <StatusGroups items={hires} category={item => item.status === "COMPLETED" || item.status === "CANCELLED" ? "Completed" : workGroup(item.status)}>{item => (
                <Button
                  key={item.id}
                  variant={item.id === selectedId ? "outlined" : "text"}
                  onClick={() => select(item.id)}
                  aria-pressed={item.id === selectedId}
                  sx={{
                    justifyContent: "flex-start",
                    textAlign: "left",
                    px: 1.5,
                    py: 1,
                    width: "100%",
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }}>
                      {item.personal.firstName} {item.personal.lastName}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {item.jobTitle} · {statusLabels[item.status]}
                    </Typography>
                  </Box>
                </Button>
              )}</StatusGroups>
            </Stack>
          </Paper>
          {view === "employee" ? (
            <EmployeeExperience
              key={hire.id + hire.status}
              hire={hire}
              onUpdate={update}
              onMessage={setNotice}
            />
          ) : (
            <Paper sx={panel}>
              <Stack spacing={2}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  sx={{ justifyContent: "space-between" }}
                  spacing={1}
                >
                  <Box>
                    <Typography variant="h3">
                      {hire.personal.firstName} {hire.personal.lastName}
                    </Typography>
                    <Typography color="text.secondary">
                      {hire.jobTitle} · {hire.department}
                    </Typography>
                  </Box>
                  <Chip
                    sx={{ alignSelf: "flex-start" }}
                    label={statusLabels[hire.status]}
                    color={
                      hire.status === "COMPLETED"
                        ? "success"
                        : hire.status === "SUBMITTED"
                          ? "warning"
                          : "default"
                    }
                  />
                </Stack>
                <Box
                  component="dl"
                  sx={{
                    m: 0,
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "1fr",
                      sm: "160px minmax(0, 1fr)",
                    },
                    gap: 1,
                    "& dt": { color: "text.secondary" },
                    "& dd": { m: 0, overflowWrap: "anywhere" },
                  }}
                >
                  <Typography component="dt">Personal email</Typography>
                  <Typography component="dd">{hire.personalEmail}</Typography>
                  <Typography component="dt">Organization login</Typography>
                  <Typography component="dd">
                    {hire.organizationLogin}
                  </Typography>
                  <Typography component="dt">Phone</Typography>
                  <Typography component="dd">{hire.personal.phone}</Typography>
                  <Typography component="dt">Start date</Typography>
                  <Typography component="dd">{hire.startDate}</Typography>
                  <Typography component="dt">Workforce access</Typography>
                  <Typography component="dd">
                    {hire.status === "COMPLETED"
                      ? "Available in demo"
                      : "Waiting for approval"}
                  </Typography>
                </Box>
                <Divider />
                {hire.status === "INVITED" && (
                  <>
                    <Alert
                      severity={
                        invitationExpired(hire, new Date()) ? "warning" : "info"
                      }
                    >
                      {invitationExpired(hire, new Date())
                        ? "Invitation expired."
                        : "Waiting for employee account setup."}{" "}
                      Expires {dateLabel(hire.expiresAt)} (Edmonton).
                    </Alert>
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      sx={{ flexWrap: "wrap" }}
                    >
                      <Button
                        variant="outlined"
                        onClick={() => setEmailOpen(true)}
                      >
                        Preview invitation email
                      </Button>
                      <Button
                        onClick={() => {
                          const now = new Date();
                          update({
                            ...hire,
                            invitedAt: now.toISOString(),
                            expiresAt: sevenDaysFrom(now),
                          });
                          setNotice(
                            "Demo invitation renewed for 7 days. No email was sent.",
                          );
                        }}
                      >
                        Resend demo invitation
                      </Button>
                      <Button
                        onClick={() => {
                          update({
                            ...hire,
                            expiresAt: new Date(Date.now() - 1).toISOString(),
                          });
                          setNotice(
                            "Invitation expired for testing. Resend it to continue setup.",
                          );
                        }}
                      >
                        Simulate expiry
                      </Button>
                    </Stack>
                  </>
                )}
                {["IN_PROGRESS", "CHANGES_REQUESTED"].includes(hire.status) && (
                  <Alert severity="info">
                    The employee is completing personal details and terms.
                    {hire.feedback && ` Review feedback: ${hire.feedback}`}
                  </Alert>
                )}
                {hire.status === "SUBMITTED" && (
                  <>
                    <Typography variant="h3">Review submission</Typography>
                    <Typography>
                      Home address: {hire.personal.address}
                    </Typography>
                    <Chip
                      label={
                        hire.personal.termsAccepted
                          ? "Demo terms accepted"
                          : "Terms not accepted"
                      }
                      sx={{ alignSelf: "flex-start" }}
                    />
                    <Typography variant="body2" color="text.secondary">
                      Required now: personal details and terms. Banking, tax and
                      SIN can follow later. Contract signing is deferred.
                    </Typography>
                    {reviewError && (
                      <Alert severity="error">{reviewError}</Alert>
                    )}
                    <TextField
                      label="Feedback for requested changes"
                      multiline
                      minRows={2}
                      value={feedback}
                      onChange={(event) => setFeedback(event.target.value)}
                      slotProps={{ htmlInput: { maxLength: 1000 } }}
                      helperText="Required only when requesting changes."
                    />
                    <Stack
                      direction="row"
                      spacing={1}
                      useFlexGap
                      sx={{ flexWrap: "wrap" }}
                    >
                      <Button
                        variant="contained"
                        disabled={!canSubmit(hire.personal)}
                        onClick={() => {
                          update({
                            ...hire,
                            status: "COMPLETED",
                            feedback: "",
                          });
                          setReviewError("");
                          setNotice(
                            "Demo onboarding approved. Workforce access is now shown as available; actual EMS permissions are unchanged.",
                          );
                        }}
                      >
                        Approve onboarding
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={() => {
                          if (!feedback.trim()) {
                            setReviewError(
                              "Add feedback so the employee knows what to change.",
                            );
                            return;
                          }
                          update({
                            ...hire,
                            status: "CHANGES_REQUESTED",
                            feedback: feedback.trim(),
                          });
                          setReviewError("");
                          setFeedback("");
                          setNotice(
                            "Demo submission returned to the employee for changes.",
                          );
                        }}
                      >
                        Request changes
                      </Button>
                    </Stack>
                  </>
                )}
                {hire.status === "COMPLETED" && (
                  <Alert severity="success">
                    Onboarding approved. Scheduling, attendance and time off are
                    available in the proposed workflow.
                  </Alert>
                )}
                {hire.status === "CANCELLED" && (
                  <Alert severity="warning">
                    Onboarding cancelled. The employee preview cannot continue.
                  </Alert>
                )}
                <Stack
                  direction="row"
                  spacing={1}
                  useFlexGap
                  sx={{ flexWrap: "wrap" }}
                >
                  <Button
                    onClick={() => {
                      setView("employee");
                      setNotice("");
                    }}
                  >
                    Open employee preview
                  </Button>
                  {!["COMPLETED", "CANCELLED"].includes(hire.status) && (
                    <Button color="error" onClick={() => setCancelOpen(true)}>
                      Cancel onboarding
                    </Button>
                  )}
                </Stack>
              </Stack>
            </Paper>
          )}
        </Box>
        <Typography variant="caption" color="text.secondary">
          Preview policy: managers and admins can invite and approve. Personal
          details and terms are required; contract signing is skipped for now.
          Workforce access begins after approval.
        </Typography>
      </Stack>
      <Dialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <Box component="form" onSubmit={createInvite}>
          <DialogTitle>Invite an accepted hire</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2">
                The job acceptance is handled outside EMS. This invitation helps
                the new hire set up their EMS account.
              </Typography>
              {inviteError && <Alert severity="error">{inviteError}</Alert>}
              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                {inviteField("firstName", "First name", "text", 50)}
                {inviteField("lastName", "Last name", "text", 50)}
              </Stack>
              {inviteField("personalEmail", "Personal email", "email", 320)}
              {inviteField("phone", "Phone number", "tel", 40)}
              {inviteField("department", "Department")}
              {inviteField("jobTitle", "Job title")}
              {inviteField("startDate", "Start date", "date")}
              <TextField
                label="Generated demo organization login"
                value={organizationLogin(
                  invite.firstName,
                  invite.lastName,
                  hires,
                )}
                slotProps={{ input: { readOnly: true } }}
                helperText="Placeholder domain only. The production organization domain is still to be configured."
              />
              <Typography variant="body2">
                Setup link expires after 7 days. Employees choose their
                password. No acceptance email or contract is included.
              </Typography>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setInviteOpen(false)}>Close</Button>
            <Button type="submit" variant="contained">
              Create demo invitation
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
      <Dialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Invitation email preview</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography variant="body2">To: {hire.personalEmail}</Typography>
            <Typography sx={{ fontWeight: 600 }}>
              Subject: Set up your EMS account
            </Typography>
            <Typography>Hi {hire.personal.firstName},</Typography>
            <Typography>
              Your hiring team has invited you to set up your EMS account for
              your role as {hire.jobTitle}. Choose your password, review your
              personal details and accept the onboarding terms.
            </Typography>
            <Typography>
              Organization login: {hire.organizationLogin}
            </Typography>
            <Typography>
              The setup invitation expires on {dateLabel(hire.expiresAt)}{" "}
              (Edmonton). Contact your hiring team if you need a new invitation.
            </Typography>
            <Button
              variant="contained"
              disabled={
                hire.status !== "INVITED" || invitationExpired(hire, new Date())
              }
              onClick={() => {
                setEmailOpen(false);
                setView("employee");
              }}
            >
              Preview employee setup
            </Button>
            <Typography variant="caption" color="text.secondary">
              This button opens the demo employee experience. Production emails
              will contain a unique setup link. No email is sent in this
              prototype.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEmailOpen(false)}>
            Close email preview
          </Button>
        </DialogActions>
      </Dialog>
      <Dialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Cancel this demo onboarding?</DialogTitle>
        <DialogContent>
          <Typography>
            {hire.personal.firstName} {hire.personal.lastName} will no longer be
            able to continue this onboarding in the preview.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>Keep onboarding</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              update({ ...hire, status: "CANCELLED" });
              setCancelOpen(false);
              setNotice("Demo onboarding cancelled.");
            }}
          >
            Confirm cancellation
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
