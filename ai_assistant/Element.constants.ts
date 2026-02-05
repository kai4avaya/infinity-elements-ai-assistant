import type { StoredDocument } from "./Element.types";

// Storage keys
export const localDocumentsKey = "ai-assistant-documents";
export const localConversationsKey = "ai-assistant-conversations";
export const sharedDocumentsKey = "__wc_local_shared_ai-assistant-documents";
export const sharedConversationsKey = "__wc_local_shared_ai-assistant-conversations";
export const sharedDbName = "__wc_idb_shared_AIAssistantDB";
export const documentDbVersion = 3;

// Company documents
export const getCompanyDocuments = (): StoredDocument[] => [
  {
    id: "company-insurance-policy",
    name: "Insurance Policy",
    type: "company",
    mimeType: "text/plain",
    content: `# Altamino Global Conglomerate - Insurance Policy

## Overview
Altamino provides comprehensive insurance coverage for all employees worldwide. Our insurance program is designed to protect our workforce and their families with industry-leading benefits.

## Health Insurance
- Medical coverage with 90% of costs covered
- Dental and vision included
- Mental health services fully covered
- Prescription drug coverage with low co-pays
- International coverage for all business travelers

## Life Insurance
- Basic life insurance: 2x annual salary
- Optional supplemental coverage up to 5x salary
- Accidental death and dismemberment coverage
- Dependent life insurance available

## Eligibility
- Full-time employees: Immediate coverage
- Part-time employees: After 90 days
- Dependents: Spouse and children up to age 26
- Domestic partners: Available in most regions

For detailed policy information, contact HR Benefits Department at ext. 5555.`,
    uploadTime: Date.now(),
    size: 1500,
    pageCount: 1,
  },
  {
    id: "company-healthcare-benefits",
    name: "Healthcare Benefits",
    type: "company",
    mimeType: "text/plain",
    content: `# Altamino Global Conglomerate - Healthcare Benefits

## Comprehensive Healthcare Program
Altamino is committed to providing world-class healthcare benefits to our global workforce and their families.

## Medical Plans
- PPO Plan: Freedom to choose any healthcare provider
- HMO Plan: Lower costs with network restrictions
- High-Deductible Plan: Health Savings Account (HSA) compatible
- International Plan: Coverage for expatriates and global travelers

## Preventive Care
- Annual physical exams: 100% covered
- Vaccinations and immunizations: No cost
- Health screenings: Age-appropriate screenings covered
- Wellness programs: Free participation with incentives

## Specialty Care
- Mental health and counseling: 20 sessions per year
- Maternity care: Prenatal through postnatal care
- Pediatric care: Children's healthcare specialists
- Chronic disease management: Diabetes, heart disease, asthma

For more information, contact Benefits Hotline at 1-800-ALTAMINO ext. 2345.`,
    uploadTime: Date.now(),
    size: 1200,
    pageCount: 1,
  },
  {
    id: "company-payment-policies",
    name: "Payment Policies",
    type: "company",
    mimeType: "text/plain",
    content: `# Altamino Global Conglomerate - Payment Policies

## Payroll Schedule
- Bi-weekly pay: Every other Friday
- Monthly pay: Last business day of month (executive level)
- Bonus payments: Quarterly and annual distributions
- Commission payments: Monthly processing

## Expense Reimbursement
- Submission deadline: 15th of following month
- Processing time: 5-7 business days
- Required documentation: Receipts for all expenses > $25
- Mileage reimbursement: Current IRS rate + 20% premium

## Payment Methods
- Direct Deposit: Preferred method for all employees
- Pay Cards: Available for unbanked employees
- Paper Checks: Available upon request with fees
- International Transfers: Wire transfers for global staff

For payment inquiries, contact Payroll Department at ext. 7777.`,
    uploadTime: Date.now(),
    size: 1000,
    pageCount: 1,
  },
  {
    id: "company-altamino-bank",
    name: "Altamino Bank",
    type: "company",
    mimeType: "text/plain",
    content: `# Altamino Bank - Banking Services and Policies

## Account Types
- **Checking Accounts**: Free checking with no minimum balance, online banking, mobile deposit
- **Savings Accounts**: High-yield savings with tiered interest rates, no monthly fees
- **Business Accounts**: Comprehensive business banking with treasury management services
- **Investment Accounts**: Wealth management and investment advisory services

## Banking Services
- **Online Banking**: 24/7 access to accounts, bill pay, transfers, and mobile check deposit
- **Mobile Banking**: Full-featured mobile app with biometric security and real-time alerts
- **ATM Network**: 50,000+ fee-free ATMs nationwide and international access
- **Wire Transfers**: Same-day domestic and international wire transfer services

## Loan Products
- **Personal Loans**: Competitive rates for debt consolidation, home improvement, and major purchases
- **Auto Loans**: New and used vehicle financing with flexible terms and rates as low as 2.99% APR
- **Mortgage Loans**: Fixed and adjustable rate mortgages, refinancing, and home equity lines
- **Business Loans**: SBA loans, equipment financing, and working capital solutions

## Security Features
- **Fraud Protection**: 24/7 monitoring, zero liability for unauthorized transactions
- **Encryption**: Bank-level 256-bit encryption for all online transactions
- **Two-Factor Authentication**: Optional enhanced security for account access
- **Account Alerts**: Real-time notifications for transactions and account changes

## Customer Support
- **Phone Support**: 24/7 customer service at 1-800-ALTAMINO-BANK
- **Online Chat**: Live chat support available during business hours
- **Branch Locations**: 200+ branches nationwide with extended hours
- **Specialized Support**: Dedicated business banking and wealth management teams

For banking inquiries, contact Altamino Bank at 1-800-ALTAMINO-BANK or visit any branch location.`,
    uploadTime: Date.now(),
    size: 1500,
    pageCount: 1,
  },
  {
    id: "company-altamino-healthcare",
    name: "Altamino Healthcare",
    type: "company",
    mimeType: "text/plain",
    content: `# Altamino Healthcare - Health Insurance Services

## Health Insurance Plans
- **PPO Plans**: Preferred Provider Organization with nationwide network and out-of-network coverage
- **HMO Plans**: Health Maintenance Organization with lower premiums and coordinated care
- **HDHP Plans**: High-Deductible Health Plans with Health Savings Account (HSA) compatibility
- **Catastrophic Plans**: Essential coverage for under-30 individuals and hardship exemptions

## Coverage Benefits
- **Preventive Care**: 100% coverage for annual physicals, vaccinations, and recommended screenings
- **Emergency Services**: Full coverage for emergency room visits and ambulance services
- **Hospitalization**: Comprehensive inpatient care with private room coverage when medically necessary
- **Prescription Drugs**: Tiered formulary with $10, $25, and $50 copays for generic, preferred, and specialty medications

## Provider Network
- **Primary Care Physicians**: 15,000+ PCPs across all specialties with same-day appointments available
- **Specialists**: Direct access to specialists without PCP referral for most PPO plans
- **Hospitals**: 800+ network hospitals including major medical centers and community hospitals
- **Telemedicine**: 24/7 virtual care with board-certified physicians for minor illnesses and mental health

## Wellness Programs
- **Health Coaching**: Personalized wellness coaching for weight management, smoking cessation, and chronic conditions
- **Fitness Benefits**: $50 monthly gym reimbursement and discounted fitness app subscriptions
- **Mental Health**: 20 covered therapy sessions per year and 24/7 crisis support line
- **Chronic Care Management**: Nurse-led care coordination for diabetes, heart disease, and asthma

## Member Services
- **Customer Service**: 24/7 member support at 1-800-ALTAMINO-HEALTH
- **Mobile App**: Digital ID cards, claims tracking, and provider directory
- **Nurse Hotline**: Free 24/7 nurse line for medical questions and guidance
- **Claims Processing**: Most claims processed within 5 business days with electronic payment options

## Additional Benefits
- **Dental Coverage**: Comprehensive dental plans with orthodontia options
- **Vision Insurance**: Annual eye exams, lenses, and frame allowances
- **International Coverage**: Emergency coverage worldwide for travel outside the U.S.
- **Alternative Medicine**: Coverage for acupuncture, chiropractic care, and naturopathic services

For healthcare inquiries, contact Altamino Healthcare at 1-800-ALTAMINO-HEALTH.`,
    uploadTime: Date.now(),
    size: 1800,
    pageCount: 1,
  },
  {
    id: "company-general-policies",
    name: "General Policies",
    type: "company",
    mimeType: "text/plain",
    content: `# Altamino Global Conglomerate - General Company Policies

## Code of Conduct
Altamino expects all employees to maintain the highest standards of integrity, ethics, and professional conduct.

## Business Ethics
- Zero tolerance for corruption and bribery
- Conflict of interest disclosure required
- Fair competition practices in all markets
- Respect for local laws and customs globally
- Protection of confidential information

## Workplace Policies
- Equal opportunity employer: EOE/M/F/D/V
- Zero tolerance for discrimination or harassment
- Drug-free workplace: Random testing permitted
- Professional dress code: Business casual standard
- Remote work: Available for eligible positions

## Time and Attendance
- Standard work week: 40 hours (exempt: as needed)
- Overtime: Pre-approved for non-exempt staff
- Flexible scheduling: Available with manager approval
- Paid time off: Accrual based on tenure and position

For policy questions, contact Human Resources at ext. 5555.`,
    uploadTime: Date.now(),
    size: 1300,
    pageCount: 1,
  },
];
