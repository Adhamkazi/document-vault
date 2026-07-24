import { initializeUsersTable } from "./userRepository";
import { initializeProfilesTable } from "./profileRepository";
import { initializeDocumentTypesTable } from "./documentTypeRepository";
import { initializeDocumentsTable } from "./documentRepository";
import { initializeNotificationsTable } from "./notificationRepository";
import { initializeAppSettingsTable } from "./appSettingsRepository";

export function initializeDatabase() {
  initializeUsersTable();
  initializeProfilesTable();
  initializeDocumentTypesTable();
  initializeDocumentsTable();
  initializeNotificationsTable();
  initializeAppSettingsTable();
}