/**
 * SmartForm Saver — Field Taxonomy
 *
 * Centralized registry of all semantic field types with their labels,
 * aliases, categories, and autocomplete attribute mappings. This is the
 * single source of truth for field classification.
 *
 * To add a new field type:
 * 1. Add the key to the SemanticField union in types/index.ts
 * 2. Add an entry here with key, label, aliases, category
 */

import type { FieldTaxonomyEntry, FieldCategory } from '../types';

export const FIELD_TAXONOMY: FieldTaxonomyEntry[] = [
  // ─── Personal ──────────────────────────────────────────────────────
  {
    key: 'full_name',
    label: 'Full Name',
    aliases: [
      'full name', 'name', 'your name', 'complete name',
      'student name', 'candidate name', 'applicant name',
      'participant name', 'member name',
    ],
    category: 'personal',
    sensitive: false,
    autocompleteValues: ['name'],
  },
  {
    key: 'first_name',
    label: 'First Name',
    aliases: [
      'first name', 'given name', 'forename', 'fname',
      'first', 'nombre',
    ],
    category: 'personal',
    sensitive: false,
    autocompleteValues: ['given-name'],
  },
  {
    key: 'middle_name',
    label: 'Middle Name',
    aliases: [
      'middle name', 'middle initial', 'middle',
    ],
    category: 'personal',
    sensitive: false,
    autocompleteValues: ['additional-name'],
  },
  {
    key: 'last_name',
    label: 'Last Name',
    aliases: [
      'last name', 'surname', 'family name', 'lname',
      'last', 'apellido',
    ],
    category: 'personal',
    sensitive: false,
    autocompleteValues: ['family-name'],
  },
  {
    key: 'date_of_birth',
    label: 'Date of Birth',
    aliases: [
      'date of birth', 'dob', 'birth date', 'birthday',
      'd.o.b', 'd.o.b.', 'born on',
    ],
    category: 'personal',
    sensitive: false,
    autocompleteValues: ['bday'],
  },
  {
    key: 'gender',
    label: 'Gender',
    aliases: [
      'gender', 'sex', 'male/female',
    ],
    category: 'personal',
    sensitive: false,
    autocompleteValues: ['sex'],
  },
  {
    key: 'blood_group',
    label: 'Blood Group',
    aliases: [
      'blood group', 'blood type', 'blood grp',
    ],
    category: 'personal',
    sensitive: false,
  },
  {
    key: 'father_name',
    label: "Father's Name",
    aliases: [
      "father's name", 'father name', "father's", 'fathers name',
      "parent's name", 'guardian name', "guardian's name",
    ],
    category: 'personal',
    sensitive: false,
  },
  {
    key: 'mother_name',
    label: "Mother's Name",
    aliases: [
      "mother's name", 'mother name', "mother's", 'mothers name',
    ],
    category: 'personal',
    sensitive: false,
  },

  // ─── Contact ───────────────────────────────────────────────────────
  {
    key: 'email',
    label: 'Email',
    aliases: [
      'email', 'e-mail', 'email address', 'e-mail address',
      'mail', 'email id', 'mail id', 'your email',
      'email-id', 'emailid', 'contact email',
    ],
    category: 'contact',
    sensitive: false,
    autocompleteValues: ['email'],
  },
  {
    key: 'phone',
    label: 'Phone',
    aliases: [
      'phone', 'phone number', 'mobile', 'mobile number',
      'cell', 'cell phone', 'telephone', 'tel',
      'contact number', 'phone no', 'phone no.',
      'mobile no', 'mobile no.', 'whatsapp number',
      'whatsapp no', 'contact no', 'contact no.',
    ],
    category: 'contact',
    sensitive: false,
    autocompleteValues: ['tel'],
  },

  // ─── Identification ───────────────────────────────────────────────
  {
    key: 'register_number',
    label: 'Register Number',
    aliases: [
      'register number', 'registration number', 'reg no',
      'reg. no', 'reg. no.', 'reg no.', 'register no',
      'register no.', 'registration no', 'registration no.',
      'student registration number', 'enrollment number',
      'enrolment number', 'enrollment no', 'roll number',
      'roll no', 'roll no.', 'hall ticket number',
      'hall ticket no', 'seat number', 'seat no',
    ],
    category: 'identification',
    sensitive: false,
  },
  {
    key: 'student_id',
    label: 'Student ID',
    aliases: [
      'student id', 'student id number', 'student identification',
      'usn', 'university seat number', 'prn', 'prn number',
      'student number', 'scholar number', 'scholar no',
    ],
    category: 'identification',
    sensitive: false,
  },
  {
    key: 'employee_id',
    label: 'Employee ID',
    aliases: [
      'employee id', 'emp id', 'employee number', 'emp no',
      'employee code', 'staff id', 'worker id',
    ],
    category: 'identification',
    sensitive: false,
  },

  // ─── Education ────────────────────────────────────────────────────
  {
    key: 'college',
    label: 'College',
    aliases: [
      'college', 'college name', 'institution',
      'institution name', 'school', 'school name',
      'institute', 'institute name',
    ],
    category: 'education',
    sensitive: false,
  },
  {
    key: 'university',
    label: 'University',
    aliases: [
      'university', 'university name', 'affiliated university',
    ],
    category: 'education',
    sensitive: false,
  },
  {
    key: 'department',
    label: 'Department',
    aliases: [
      'department', 'dept', 'dept.', 'department name',
      'branch', 'stream', 'discipline', 'specialization',
      'major',
    ],
    category: 'education',
    sensitive: false,
  },
  {
    key: 'course',
    label: 'Course',
    aliases: [
      'course', 'course name', 'program', 'programme',
      'degree', 'degree program', 'program name',
    ],
    category: 'education',
    sensitive: false,
  },
  {
    key: 'year',
    label: 'Year',
    aliases: [
      'year', 'year of study', 'academic year',
      'current year', 'passing year', 'batch',
      'batch year', 'graduation year',
    ],
    category: 'education',
    sensitive: false,
  },
  {
    key: 'section',
    label: 'Section',
    aliases: [
      'section', 'class section', 'division',
      'class', 'group',
    ],
    category: 'education',
    sensitive: false,
  },

  // ─── Address ──────────────────────────────────────────────────────
  {
    key: 'address',
    label: 'Address',
    aliases: [
      'address', 'street address', 'street', 'address line 1',
      'address line', 'residential address', 'permanent address',
      'current address', 'mailing address', 'postal address',
    ],
    category: 'address',
    sensitive: false,
    autocompleteValues: ['street-address', 'address-line1'],
  },
  {
    key: 'city',
    label: 'City',
    aliases: [
      'city', 'town', 'city/town', 'city name',
      'district',
    ],
    category: 'address',
    sensitive: false,
    autocompleteValues: ['address-level2'],
  },
  {
    key: 'state',
    label: 'State',
    aliases: [
      'state', 'state/province', 'province', 'region',
      'state name',
    ],
    category: 'address',
    sensitive: false,
    autocompleteValues: ['address-level1'],
  },
  {
    key: 'country',
    label: 'Country',
    aliases: [
      'country', 'nation', 'country name', 'country/region',
    ],
    category: 'address',
    sensitive: false,
    autocompleteValues: ['country-name', 'country'],
  },
  {
    key: 'postal_code',
    label: 'Postal Code',
    aliases: [
      'postal code', 'zip code', 'zip', 'pincode', 'pin code',
      'pin', 'postcode', 'post code', 'area code',
    ],
    category: 'address',
    sensitive: false,
    autocompleteValues: ['postal-code'],
  },

  // ─── Professional ─────────────────────────────────────────────────
  {
    key: 'organization',
    label: 'Organization',
    aliases: [
      'organization', 'organisation', 'company', 'company name',
      'firm', 'workplace', 'employer',
    ],
    category: 'professional',
    sensitive: false,
    autocompleteValues: ['organization'],
  },
  {
    key: 'designation',
    label: 'Designation',
    aliases: [
      'designation', 'job title', 'title', 'position',
      'role', 'job role',
    ],
    category: 'professional',
    sensitive: false,
    autocompleteValues: ['organization-title'],
  },
];

/** Lookup map from semantic field key to taxonomy entry. */
export const TAXONOMY_MAP: Record<string, FieldTaxonomyEntry> = {};
for (const entry of FIELD_TAXONOMY) {
  TAXONOMY_MAP[entry.key] = entry;
}

/** Get taxonomy entry by field key. */
export function getTaxonomyEntry(field: string): FieldTaxonomyEntry | undefined {
  return TAXONOMY_MAP[field];
}

/** Get all fields in a category. */
export function getFieldsByCategory(category: FieldCategory): FieldTaxonomyEntry[] {
  return FIELD_TAXONOMY.filter((e) => e.category === category);
}

/** Category display order and labels. */
export const CATEGORY_CONFIG: Array<{ key: FieldCategory; label: string; icon: string }> = [
  { key: 'personal', label: 'Personal', icon: '👤' },
  { key: 'contact', label: 'Contact', icon: '📧' },
  { key: 'identification', label: 'Identification', icon: '🪪' },
  { key: 'education', label: 'Education', icon: '🎓' },
  { key: 'address', label: 'Address', icon: '📍' },
  { key: 'professional', label: 'Professional', icon: '💼' },
  { key: 'other', label: 'Other', icon: '📋' },
];
