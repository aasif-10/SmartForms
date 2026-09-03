# Privacy Policy

**Effective Date:** September 2026

## Overview
SmartForm Saver ("the Extension") is designed with a strict privacy-first architecture. This Privacy Policy explains what data the Extension collects, how it is stored, and how it is used.

## 1. Data Collection and Storage
**All data collected by the Extension is stored locally on your device.** 
The Extension uses the standard `chrome.storage.local` API to save the information you choose to enter into web forms (e.g., your name, email, address, etc.).

## 2. No External Servers or Telemetry
The Extension **does not** communicate with any external servers.
- We do not transmit your form data to any third party.
- We do not use analytics, tracking pixels, or telemetry to monitor your usage.
- We do not collect crash reports or IP addresses.

## 3. Sensitive Information
The Extension includes a built-in blocklist for sensitive fields (such as passwords, OTPs, CVVs, and credit card numbers). The Extension will actively ignore these fields and will never attempt to save or suggest values for them.

## 4. Permissions
The Extension requires the following permissions to function:
- `storage`: To save your information locally on your device.
- `activeTab` / `host_permissions`: To scan the current web page for form fields so it can offer autofill suggestions.

## 5. Your Rights and Data Control
Because all data is stored on your device, you have complete control over it. You can view, edit, export, or delete your saved information at any time via the Extension's Options page. Clearing your browser data or uninstalling the Extension will also permanently delete all saved information.

## 6. Changes to this Policy
We may update this Privacy Policy from time to time. Since the Extension does not communicate with external servers, any updates to the policy will be included in new versions of the Extension.

## 7. Contact
If you have any questions about this Privacy Policy, please open an issue in the project's GitHub repository.
