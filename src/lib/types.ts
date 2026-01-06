// Type definitions based on the new docs/backend.json

// Top-level entities
export interface Company {
    id: string;
    name: string;
    contact: string;
    address: string;
    logoUrl: string;
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
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
    status: "active" | "closed";
    totalWork: number;
    doneWork: number;
    approvedWork: number;
    createdAt: any; // Firestore Timestamp
    updatedAt: any; // Firestore Timestamp
}

export interface Equipment {
    id: string;
    companyId: string;
    projectId: string;
    projectName?: string;
    equipmentNameId: string;
    equipmentName?: string;
    plateNumber: string;
    pmId: string;
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

export interface Zone {
    id: string;
    name: string;
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

    