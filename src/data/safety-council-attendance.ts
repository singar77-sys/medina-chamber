export interface SCMeeting {
  date: string;
  label: string;
  completed: boolean;
}

export interface SCCompanyRecord {
  companyName: string;
  enrolled: boolean;
  attendance: (boolean | null)[]; // true=attended, false=missed, null=future
  externalCredits: number;        // 0-2
  onsiteCredit: boolean;
}

export interface SCFiscalYear {
  label: string;
  required: number;
  lastUpdated: string;
  meetings: SCMeeting[];
  companies: SCCompanyRecord[];
}

export const FY26: SCFiscalYear = {
  label: "FY26",
  required: 10,
  lastUpdated: "2026-04-29",
  meetings: [
    { date: "2025-07-15", label: "Jul", completed: true },
    { date: "2025-08-19", label: "Aug", completed: true },
    { date: "2025-09-16", label: "Sep", completed: true },
    { date: "2025-10-21", label: "Oct", completed: true },
    { date: "2025-11-18", label: "Nov", completed: true },
    { date: "2025-12-16", label: "Dec", completed: true },
    { date: "2026-01-20", label: "Jan", completed: true },
    { date: "2026-02-17", label: "Feb", completed: true },
    { date: "2026-03-18", label: "Mar", completed: true },
    { date: "2026-04-21", label: "Apr", completed: true },
    { date: "2026-05-19", label: "May", completed: false },
    { date: "2026-06-16", label: "Jun", completed: false },
  ],
  // SAMPLE DATA — replace via admin form once built
  companies: [
    {
      companyName: "Acme Manufacturing Co.",
      enrolled: true,
      attendance: [true, true, true, true, true, true, true, true, true, true, null, null],
      externalCredits: 0,
      onsiteCredit: false,
    },
    {
      companyName: "Medina Valley Insurance Group",
      enrolled: true,
      attendance: [true, true, false, true, true, true, true, true, false, true, null, null],
      externalCredits: 1,
      onsiteCredit: false,
    },
    {
      companyName: "Lakewood Professional Services",
      enrolled: true,
      attendance: [true, false, true, true, false, true, true, false, true, true, null, null],
      externalCredits: 0,
      onsiteCredit: false,
    },
    {
      companyName: "Brunswick Auto Group",
      enrolled: true,
      attendance: [true, true, false, false, true, true, true, false, false, true, null, null],
      externalCredits: 0,
      onsiteCredit: false,
    },
    {
      companyName: "Medina Fabrication & Welding",
      enrolled: true,
      attendance: [false, true, false, true, false, true, false, true, false, false, null, null],
      externalCredits: 2,
      onsiteCredit: true,
    },
    {
      companyName: "Valley City Technology Group",
      enrolled: true,
      attendance: [false, false, false, true, false, false, false, true, false, true, null, null],
      externalCredits: 0,
      onsiteCredit: false,
    },
    {
      companyName: "Wadsworth Home Health",
      enrolled: true,
      attendance: [true, true, true, true, true, false, false, true, true, false, null, null],
      externalCredits: 0,
      onsiteCredit: false,
    },
    {
      companyName: "County Line Logistics",
      enrolled: true,
      attendance: [true, false, true, true, true, true, false, false, true, false, null, null],
      externalCredits: 1,
      onsiteCredit: false,
    },
    {
      companyName: "Heritage Builders LLC",
      enrolled: false,
      attendance: [true, false, false, true, false, false, true, false, false, true, null, null],
      externalCredits: 0,
      onsiteCredit: false,
    },
    {
      companyName: "North Medina Medical Group",
      enrolled: true,
      attendance: [false, false, false, false, true, false, false, false, false, false, null, null],
      externalCredits: 0,
      onsiteCredit: false,
    },
    {
      companyName: "Seville Pipe & Supply",
      enrolled: true,
      attendance: [true, true, true, false, true, true, false, true, true, false, null, null],
      externalCredits: 0,
      onsiteCredit: false,
    },
    {
      companyName: "Medina County Financial Partners",
      enrolled: true,
      attendance: [true, true, true, true, true, true, true, true, true, true, null, null],
      externalCredits: 2,
      onsiteCredit: true,
    },
    {
      companyName: "Rittman Steel Fabricators",
      enrolled: true,
      attendance: [true, false, true, false, true, false, true, false, true, false, null, null],
      externalCredits: 0,
      onsiteCredit: false,
    },
    {
      companyName: "Lafayette Township Electric",
      enrolled: true,
      attendance: [true, true, false, true, true, true, false, true, false, false, null, null],
      externalCredits: 0,
      onsiteCredit: false,
    },
    {
      companyName: "Medina Square Realty",
      enrolled: false,
      attendance: [false, true, false, false, false, false, false, false, false, false, null, null],
      externalCredits: 0,
      onsiteCredit: false,
    },
  ],
};
