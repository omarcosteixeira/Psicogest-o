# Security Specification for PsicoGestão

## Data Invariants
1. **Patients**: 
   - A patient must have a valid CPF.
   - Public can create a patient with status 'TRIAGEM'.
   - Only authenticated users can update patient status or details.
2. **Appointments**:
   - Must be linked to a valid patient ID.
   - Public can query appointments by patient ID (obtained after CPF check).
3. **Evolutions**:
   - Must be linked to a valid appointment and patient.
   - Only Professor role can approve/reject evolutions.
4. **Users**:
   - Only Admin can create/edit users.
   - Password must be stored securely (Firebase Auth is recommended).
5. **Settings**:
   - Read access is public for the landing page.
   - Write access is restricted to Admin.

## The "Dirty Dozen" Payloads
1. **Unauthorized User Creation**: Attacker attempts to create an ADMIN user via client SDK.
2. **Patient Status Bypass**: Public user attempts to register a patient with status 'PACIENTE_ATIVO' instead of 'TRIAGEM'.
3. **Appointment Hijack**: Attacker attempts to change the `student_id` of an existing appointment.
4. **PII Leak**: Unauthenticated user attempts to list all patients and their phones/addresses.
5. **Evolution Tampering**: Student attempts to approve their own evolution record.
6. **Settings Sabotage**: Unauthenticated user attempts to clear the `heroImageUrl` or `carouselImages`.
7. **Identity Spoofing**: Attacker attempts to create a patient with someone else's CPF.
8. **Invalid Role Assignment**: Attacker attempts to change their own role to 'ADMIN'.
9. **Resource Exhaustion**: Attacker attempts to upload a massive string (1MB+) into a name field.
10. **Orphaned Evolution**: Attacker attempts to create an evolution record not linked to any existing appointment.
11. **Negative Interval**: Attacker attempts to set the clinic interval to a negative number.
12. **System Field Injection**: Attacker attempts to add a `isVerified: true` field to a user document that doesn't exist in schema.

## Security Rules Strategy
- **Identity**: Since the current system uses a custom `users` collection, true identity verification at the Firestore rule level is restricted unless we migrate to Firebase Auth.
- **Master Gate**: Access to evolutions will be validated against appointment status.
- **Validation Blueprints**: Every write will be checked for correct types and sizes.
- **PII Isolation**: Phone and address fields will be protected.

## Implementation Plan
1. **Migration**: Move from custom registration/password to Firebase Authentication.
2. **Rules**: Implement rules using `request.auth` for identity.
3. **Schema**: Enforce strict schema validation in rules.
