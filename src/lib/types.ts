
// Type definitions based on the new docs/backend.json

// Top-level entities
export interface Company {
    id: string;
    name: string;
    contact?: string; // Made optional
    address?: string; // Made optional
    logoUrl?: string; // Made optional
    directorIds?: string[];
    pmIds?: string[];
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
    archived?: boolean;
    description?: string;
    email?: string;
    mobile?: string;
    contactPerson?: string;
}

export interface User {
    id: string;
    name: string;
    email: string;
    position: "Admin" | "CEO" | "Director" | "PM" | "CM" | "Engineer" | "General Foreman" | "Safety Officer" | "Safety Manager" | "Logistic" | "Document Controller" | "Accountant" | "progress_control";
    companyId: string;
    salaryNumber?: string;
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
}

export interface Project {
    id: string;
    companyId: string;
    name: string;
    directorId: string;
    pmId: string;
    pmName?: string;
    status: "active" | "closed";
    totalWork: number;
    doneWork: number;
    approvedWork: number;
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp;
    archived?: boolean;
    address?: string;
    googleMapsUrl?: string;
    kmlUrl?: string;
}

export interface Equipment {
    id: string;
    companyId?: string; // Should be optional if it can be derived from project
    projectId: string;
    projectName?: string;
    equipmentNameId: string;
    equipmentName?: string;
    plateNumber: string;
    pmId?: string; // Should be optional if it can be derived from project
    pmName?: string;
    assigneeId: string;
    assigneeName?: string;
    situation: "Working at site" | "Broke down at site" | "In garage";
    remarks?: string;
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
    ownershipType: "Company" | "Rent";
    ownerCompanyId?: string;
    rentalOwnerCompany?: string;
    rentalContactPerson?: string;
    rentalMobile?: string;
    rentalPhone?: string;
    rentalMonthlyRent?: number;
    rentalAnnualRent?: number;
    rentalStartDate?: any; // Firestore Timestamp
    ownershipCertificateDate?: string;
    thirdPartyCertificateDate?: string;
}

export interface EquipmentName {
    id: string;
    name: string;
}

export interface Invitation {
    id: string;
    code: string;
    email: string;
    name: string;
    position: string;
    companyId: string;
    status: "pending" | "completed";
    createdAt: any; // Firestore Timestamp
    creatorId: string;
    creatorName: string;
    completedAt?: any; // Firestore Timestamp
    usedBy?: string;
    salaryNumber?: string;
}

export interface Document {
    id: string;
    projectId: string;
    creatorId: string;
    pmId: string;
    type: "Permit" | "Document" | "Payment";
    status: "Pending" | "Under Review" | "Approved";
    documentDate: any; // Firestore Timestamp
    remarks?: string;
    createdAt: any; // Firestore Timestamp
    pmApprovedAt?: any; // Firestore Timestamp
    pmApproverId?: string;
    adminApprovedAt?: any; // Firestore Timestamp
    adminApproverId?: string;
}

// Nested / Subcollection entities
export interface UserProjectMembership {
    role: string;
    companyId: string;
    projectName: string;
    projectStatus: "active" | "closed";
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
}

export interface ProjectMember {
    role: "director" | "pm" | "cm" | "engineer" | "foreman" | "safety" | "logistics" | "doc_controller" | "accounting";
    companyId: string;
    userName: string;
    position: string;
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
}

export interface EquipmentLog {
    id: string;
    timestamp: any; // Firestore Timestamp
    userId: string;
    userName: string;
    eventType: "Status Change" | "Assignment Change" | "Breakdown" | "Repair";
    details: object;
}

export interface Unit {
    id: string;
    name: string;
}

export interface Zone {
    id: string;
    name: string;
    mapSvg?: string;
}

export interface Activity {
    id: string;
    name: string;
    code: string;
    description: string;
    totalWork?: number;
    doneWork?: number;
    approvedWork?: number;
    workGradeA?: number;
    workGradeB?: number;
    workGradeC?: number;

    plannedQuantity?: number;
    plannedStartDate?: any; // Firestore Timestamp
    plannedEndDate?: any; // Firestore Timestamp
}

export interface SubActivity {
    id: string;
    name: string;
    BoQ: string;
    description: string;
    unit: string;
    totalWork: number;
    doneWork?: number;
    approvedWork?: number;
    workGradeA?: number;
    workGradeB?: number;
    workGradeC?: number;
    plannedQuantity?: number;
    plannedStartDate?: any; // Firestore Timestamp
    plannedEndDate?: any; // Firestore Timestamp
}

export interface SubActivityZoneQuantity {
    zoneId: string;
    quantity: number;
}

export interface ProgressReport {
    id: string;
    companyId: string;
    projectId: string;
    activityId: string;
    subActivityId: string;
    zoneId: string;
    engineerId: string;
    cmId: string;
    quantity: number;
    date: any; // Firestore Timestamp
    diaryDate: string; // YYYYMMDD
    remarks?: string;
    createdAt: any; // Firestore Timestamp
    status: "Pending" | "A" | "B" | "C"; // Approved, Approved w/ Remarks, Rejected
    inspectionStatus: "Pending" | "Complete";
    gradeAQuantity?: number;
    gradeBQuantity?: number;
    gradeCQuantity?: number;
    inspectionDate?: any; // Firestore Timestamp
    inspectorRemarks?: string;
    wirUserId?: string;
    generalForeman?: string;
    foreman?: string;
    road?: string;
    subcontractor?: string;
}

export interface DailyReport {
    id: string;
    projectId: string;
    companyId: string;
    engineerId: string;
    engineerName: string;
    pmId: string;
    cmId: string;
    reportDate: any; // Firestore Timestamp
    diaryDate: string; // YYYYMMDD
    createdAt: any; // Firestore Timestamp
    status: "Pending" | "Approved";
}

export interface ReportItem {
    id: string;
    activityId: string;
    subActivityId: string;
    zoneId: string;
    quantity: number;
    remarks?: string;
    generalForeman?: string;
    foreman?: string;
    road?: string;
    subcontractor?: string;
}


// Denormalized / Dashboard entities
export interface ReportIndex {
    id: string;
    companyId: string;
    projectId: string;
    projectName: string;
    activityName: string;
    subActivityName: string;
    zoneName: string;
    engineerName: string;
    cmName: string;
    quantity: number;
    date: any; // Firestore Timestamp
    createdAt: any; // Firestore Timestamp
    sourcePath: string;
}

export interface AdminDashboardSummary {
    companiesCount: number;
    projectsActiveCount: number;
    equipmentActiveCount: number;
    updatedAt: any; // Firestore Timestamp
}

export interface CompanyDashboardSummary {
    activeProjects: number;
    totalEquipment: number;
    equipmentWorking: number;
    equipmentBroken: number;
    equipmentGarage: number;
    updatedAt: any; // Firestore Timestamp
}

export interface ProjectDashboardSummary {
    totalWork: number;
    doneWork: number;
    progressPercent: number;
    lastReportAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
}

// Legacy types, kept for compatibility if needed. Will be removed later.
export interface UserProfile {
  name: string;
  email: string;
  role: string;
  project: string | null;
}

export interface ConstructionActivity {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  status: string;
}

export interface ProgressLog {
  id: string;
  activityId: string;
  logDate: any; // Can be a Date or a Firestore Timestamp
  description: string;
  imageUrls?: string[];
  progressPercentage: number;
  status: string;
}

export interface ProgressLogWithActivity extends ProgressLog {
  activityName: string;
}

export interface EquipmentType {
  id: string;
  name: string;
}
