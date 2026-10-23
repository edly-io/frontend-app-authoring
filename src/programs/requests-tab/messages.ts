import { defineMessages } from '@edx/frontend-platform/i18n';

const messages = defineMessages({
  // ── Tab layout ────────────────────────────────────────────────────────────
  viewList: { id: 'programs.requests.view.list', defaultMessage: 'Requests' },
  viewAuditLog: { id: 'programs.requests.view.auditLog', defaultMessage: 'Audit Log' },
  subNavLabel: { id: 'programs.requests.subNav.label', defaultMessage: 'Requests sub-sections' },
  subNavLeaves: { id: 'programs.requests.subNav.leaves', defaultMessage: 'Leaves' },
  subNavRemoteSessions: { id: 'programs.requests.subNav.remoteSessions', defaultMessage: 'Remote Sessions' },
  subNavSubstitutes: { id: 'programs.requests.subNav.substitutes', defaultMessage: 'Substitute Requests' },
  awaitingAction: { id: 'programs.requests.subNav.awaitingAction', defaultMessage: '{count} awaiting action' },

  // ── Shared ────────────────────────────────────────────────────────────────
  cancel: { id: 'programs.requests.cancel', defaultMessage: 'Cancel' },
  clear: { id: 'programs.requests.clear', defaultMessage: 'Clear' },
  save: { id: 'programs.requests.save', defaultMessage: 'Save' },
  saving: { id: 'programs.requests.saving', defaultMessage: 'Saving' },
  from: { id: 'programs.requests.date.from', defaultMessage: 'From' },
  to: { id: 'programs.requests.date.to', defaultMessage: 'To' },
  allStatuses: { id: 'programs.requests.filter.allStatuses', defaultMessage: 'All statuses' },
  status: { id: 'programs.requests.status', defaultMessage: 'Status' },
  history: { id: 'programs.requests.history', defaultMessage: 'History' },
  more: { id: 'programs.requests.collapsible.more', defaultMessage: 'more' },
  less: { id: 'programs.requests.collapsible.less', defaultMessage: 'less' },

  // ── Admin requests list ───────────────────────────────────────────────────
  loadingRequests: { id: 'programs.requests.loading', defaultMessage: 'Loading requests...' },
  loadRequestsError: { id: 'programs.requests.loadError', defaultMessage: 'Failed to load requests' },
  updateRequestError: { id: 'programs.requests.updateError', defaultMessage: 'Failed to update request' },
  bulkApproveError: { id: 'programs.requests.bulkApprove.error', defaultMessage: 'Bulk approve failed' },
  bulkApprovePartial: {
    id: 'programs.requests.bulkApprove.partial',
    defaultMessage: 'Approved {approved}. {ignored} could not be approved.',
  },
  sectionRequests: { id: 'programs.requests.section.requests', defaultMessage: 'Requests' },
  sectionLeaveSummaries: { id: 'programs.requests.section.leaveSummaries', defaultMessage: 'Leave Summaries' },
  search: { id: 'programs.requests.filter.search', defaultMessage: 'Search' },
  searchPlaceholder: { id: 'programs.requests.filter.search.placeholder', defaultMessage: 'Search...' },
  submissionDate: { id: 'programs.requests.filter.submissionDate', defaultMessage: 'Submission date' },
  selectAllPending: { id: 'programs.requests.bulk.selectAll', defaultMessage: 'Select all pending ({count})' },
  bulkApprove: { id: 'programs.requests.bulk.approve', defaultMessage: 'Bulk Approve' },
  bulkApproveCount: { id: 'programs.requests.bulk.approveCount', defaultMessage: 'Bulk Approve ({count})' },
  noRequests: { id: 'programs.requests.empty', defaultMessage: 'No requests found.' },
  noRequestsTable: { id: 'programs.requests.empty.table', defaultMessage: 'No requests' },
  columnSubmitter: { id: 'programs.requests.column.submitter', defaultMessage: 'Submitter' },
  columnDetail: { id: 'programs.requests.column.detail', defaultMessage: 'Detail' },
  columnReason: { id: 'programs.requests.column.reason', defaultMessage: 'Reason' },
  columnSubmitted: { id: 'programs.requests.column.submitted', defaultMessage: 'Submitted' },
  columnReviewerNote: { id: 'programs.requests.column.reviewerNote', defaultMessage: 'Reviewer note' },
  columnAttachment: { id: 'programs.requests.column.attachment', defaultMessage: 'Attachment' },
  columnAuditLog: { id: 'programs.requests.column.auditLog', defaultMessage: 'Audit log' },
  columnActions: { id: 'programs.requests.column.actions', defaultMessage: 'Actions' },
  wouldExceedThreshold: { id: 'programs.requests.flag.threshold', defaultMessage: 'Approval would exceed threshold' },
  sessionConflict: { id: 'programs.requests.flag.conflict', defaultMessage: 'Sessions scheduled during leave period' },
  roleInstructor: { id: 'programs.requests.role.instructor', defaultMessage: 'Instructor' },
  roleTrainee: { id: 'programs.requests.role.trainee', defaultMessage: 'Trainee' },
  roleAdmin: { id: 'programs.requests.role.admin', defaultMessage: 'Admin' },

  // ── Row actions ───────────────────────────────────────────────────────────
  approve: { id: 'programs.requests.action.approve', defaultMessage: 'Approve' },
  reject: { id: 'programs.requests.action.reject', defaultMessage: 'Reject' },
  approveWithdrawalAction: { id: 'programs.requests.action.approveWithdrawal', defaultMessage: 'Approve Withdrawal' },
  rejectWithdrawalAction: { id: 'programs.requests.action.rejectWithdrawal', defaultMessage: 'Reject Withdrawal' },
  pastLeaveApproveWarning: {
    id: 'programs.requests.warning.pastApprove',
    defaultMessage: "Leave date has passed. Check the trainee wasn't marked present before approving.",
  },
  pastLeaveWithdrawalWarning: {
    id: 'programs.requests.warning.pastWithdrawal',
    defaultMessage: "Leave date has passed. Approving cancels the leave and returns it to the trainee's balance. Add a note to say why.",
  },
  pastLeaveShortWarning: { id: 'programs.requests.warning.pastShort', defaultMessage: 'Leave date has already passed.' },

  // ── Review note modal ─────────────────────────────────────────────────────
  approveWithdrawalTitle: { id: 'programs.requests.note.approveWithdrawal', defaultMessage: 'Approve withdrawal' },
  rejectWithdrawalTitle: { id: 'programs.requests.note.rejectWithdrawal', defaultMessage: 'Reject withdrawal' },
  rejectRequestTitle: { id: 'programs.requests.note.rejectRequest', defaultMessage: 'Reject request' },
  noteRequiredLabel: { id: 'programs.requests.note.requiredLabel', defaultMessage: 'Justification note (required)' },
  noteOptionalLabel: { id: 'programs.requests.note.optionalLabel', defaultMessage: 'Note for the learner (optional)' },
  noteRequiredPlaceholder: {
    id: 'programs.requests.note.requiredPlaceholder',
    defaultMessage: 'Explain why this withdrawal is being approved after the leave date.',
  },
  noteOptionalPlaceholder: {
    id: 'programs.requests.note.optionalPlaceholder',
    defaultMessage: "Let them know why you couldn't approve this request.",
  },

  // ── Bulk approve confirmation ─────────────────────────────────────────────
  bulkPastTitle: {
    id: 'programs.requests.bulkPast.title',
    defaultMessage: 'Approve past-dated {count, plural, one {leave} other {leaves}}?',
  },
  bulkPastBody: {
    id: 'programs.requests.bulkPast.body',
    defaultMessage: 'You are approving {selected} {selected, plural, one {leave} other {leaves}}; {past} of them {past, plural, one {is for a date that has} other {are for dates that have}} already passed (listed below):',
  },
  bulkPastConfirm: { id: 'programs.requests.bulkPast.confirm', defaultMessage: 'Approve all ({count})' },
  bulkPastQuestion: {
    id: 'programs.requests.bulkPast.question',
    defaultMessage: '{count, plural, one {Approve it anyway?} other {Approve them anyway?}}',
  },

  // ── Leave settings ────────────────────────────────────────────────────────
  leaveSettings: { id: 'programs.requests.leaveSettings', defaultMessage: 'Leave settings' },
  leaveSettingsLoading: { id: 'programs.requests.leaveSettings.loading', defaultMessage: 'Loading leave settings' },
  leaveSettingsLoadError: {
    id: 'programs.requests.leaveSettings.loadError',
    defaultMessage: "Couldn't load leave settings. Try again.",
  },
  leaveSettingsSaveError: { id: 'programs.requests.leaveSettings.saveError', defaultMessage: 'Failed to save threshold.' },
  thresholdLabel: { id: 'programs.requests.threshold.label', defaultMessage: 'Leave threshold (days)' },
  thresholdDecrease: { id: 'programs.requests.threshold.decrease', defaultMessage: 'Decrease threshold' },
  thresholdIncrease: { id: 'programs.requests.threshold.increase', defaultMessage: 'Increase threshold' },
  leaveThresholdHelp: {
    id: 'programs.requests.threshold.help',
    defaultMessage: 'Learners who go over this many days are flagged as at risk, and approving their leave shows a warning.',
    description: 'Help text under the leave threshold field in the Leave settings modal, explaining what the threshold does.',
  },

  // ── Leave usage ───────────────────────────────────────────────────────────
  leaveUsage: { id: 'programs.requests.usage.title', defaultMessage: 'Leave Usage' },
  searchLearners: { id: 'programs.requests.usage.search', defaultMessage: 'Search learners' },
  searchLearnersPlaceholder: { id: 'programs.requests.usage.search.placeholder', defaultMessage: 'Search by name or email…' },
  learnersFilter: { id: 'programs.requests.usage.filter', defaultMessage: 'Learners' },
  allLearners: { id: 'programs.requests.usage.filter.all', defaultMessage: 'All learners' },
  atRiskLearners: { id: 'programs.requests.usage.filter.atRisk', defaultMessage: 'At risk learners' },
  loadingUsage: { id: 'programs.requests.usage.loading', defaultMessage: 'Loading leave usage' },
  loadUsageError: { id: 'programs.requests.usage.loadError', defaultMessage: 'Failed to load leave usage' },
  noLearners: { id: 'programs.requests.usage.empty', defaultMessage: 'No learners found.' },
  columnName: { id: 'programs.requests.usage.column.name', defaultMessage: 'Name' },
  columnEmail: { id: 'programs.requests.usage.column.email', defaultMessage: 'Email' },
  columnLeavesUsed: { id: 'programs.requests.usage.column.leavesUsed', defaultMessage: 'Leaves Used' },
  leavesUsedField: { id: 'programs.requests.usage.field.leavesUsed', defaultMessage: 'Leaves used' },
  columnFullDay: { id: 'programs.requests.usage.column.fullDay', defaultMessage: 'Full-day' },
  columnSessionSpecific: { id: 'programs.requests.usage.column.sessionSpecific', defaultMessage: 'Session-specific' },
  leavesUsedAria: { id: 'programs.requests.usage.meter.aria', defaultMessage: '{used} of {threshold} leaves used' },

  // ── Substitute requests ───────────────────────────────────────────────────
  loadingSubstitutes: { id: 'programs.requests.substitutes.loading', defaultMessage: 'Loading substitute requests...' },
  loadSubstitutesError: { id: 'programs.requests.substitutes.loadError', defaultMessage: 'Failed to load substitute requests' },
  closeSubstituteError: { id: 'programs.requests.substitutes.closeError', defaultMessage: 'Failed to close substitute request' },
  cancelSessionError: { id: 'programs.requests.substitutes.cancelError', defaultMessage: 'Failed to cancel session' },
  sessionDate: { id: 'programs.requests.substitutes.filter.sessionDate', defaultMessage: 'Session date' },
  noSubstitutes: {
    id: 'programs.requests.substitutes.empty',
    defaultMessage: 'No substitute requests found for this program.',
  },
  noSubstitutesTable: { id: 'programs.requests.substitutes.empty.table', defaultMessage: 'No substitute requests' },
  columnSession: { id: 'programs.requests.substitutes.column.session', defaultMessage: 'Session' },
  columnInstructorOnLeave: { id: 'programs.requests.substitutes.column.onLeave', defaultMessage: 'Instructor on Leave' },
  instructorOnLeaveField: { id: 'programs.requests.substitutes.field.onLeave', defaultMessage: 'Instructor on leave' },
  columnLeavePeriod: { id: 'programs.requests.substitutes.column.leavePeriod', defaultMessage: 'Leave period' },
  columnSubstitute: { id: 'programs.requests.substitutes.column.substitute', defaultMessage: 'Substitute' },
  locationField: { id: 'programs.requests.substitutes.field.location', defaultMessage: 'Location' },
  confirmCancelSession: {
    id: 'programs.requests.substitutes.confirmCancel',
    defaultMessage: 'Cancel this session and close the substitute request?',
  },
  cancelSession: { id: 'programs.requests.substitutes.cancelSession', defaultMessage: 'Cancel Session' },
  goBack: { id: 'programs.requests.substitutes.goBack', defaultMessage: 'No, go back' },
  closeRequest: { id: 'programs.requests.substitutes.close', defaultMessage: 'Close' },
  assignSubstitute: { id: 'programs.requests.substitutes.assign', defaultMessage: 'Assign Substitute' },

  // ── Assign substitute modal ───────────────────────────────────────────────
  assignError: { id: 'programs.requests.assign.error', defaultMessage: 'Failed to assign substitute' },
  courseLine: { id: 'programs.requests.assign.course', defaultMessage: 'Course: ' },
  onLeaveTitle: { id: 'programs.requests.assign.onLeaveTitle', defaultMessage: 'Current instructor(s) on leave:' },
  onLeaveHint: {
    id: 'programs.requests.assign.onLeaveHint',
    defaultMessage: 'Update the instructor(s) below to assign a substitute.',
  },
  noSubstitutesTitle: { id: 'programs.requests.assign.noneTitle', defaultMessage: 'No substitutes available.' },
  noSubstitutesForCourse: {
    id: 'programs.requests.assign.noneForCourse',
    defaultMessage: 'All instructors assigned to {course} are on approved leave on this date. Cancel the session to close this request.',
  },
  noSubstitutesForProgram: {
    id: 'programs.requests.assign.noneForProgram',
    defaultMessage: 'All instructors in this program are on approved leave on this date. Cancel the session to close this request.',
  },
  sessionTitle: { id: 'programs.requests.assign.sessionTitle', defaultMessage: 'Session title' },
  courseLabel: { id: 'programs.requests.assign.courseLabel', defaultMessage: 'Course' },
  coursePlaceholder: { id: 'programs.requests.assign.coursePlaceholder', defaultMessage: 'Search by course title...' },
  instructorsLabel: { id: 'programs.requests.assign.instructorsLabel', defaultMessage: 'Instructor(s)' },
  selectCourseFirst: { id: 'programs.requests.assign.selectCourseFirst', defaultMessage: 'Select a course first' },
  instructorsPlaceholder: { id: 'programs.requests.assign.instructorsPlaceholder', defaultMessage: 'Search by name or email...' },
  scopeCourse: {
    id: 'programs.requests.assign.scopeCourse',
    defaultMessage: 'Only instructors assigned to {course} are shown. Instructors on approved leave on this date are excluded.',
  },
  scopeCity: {
    id: 'programs.requests.assign.scopeCity',
    defaultMessage: "Only instructors from the program's city are shown. Instructors on approved leave on this date are excluded.",
  },
  sameInstructors: {
    id: 'programs.requests.assign.sameInstructors',
    defaultMessage: 'Please assign a different instructor to enable saving.',
  },
  close: { id: 'programs.requests.assign.close', defaultMessage: 'Close' },
});

export default messages;
