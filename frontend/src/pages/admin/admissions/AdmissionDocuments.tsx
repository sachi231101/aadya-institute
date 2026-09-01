import React from "react";
import { DocumentManagement } from "../students/StudentDocuments";

export const AdmissionDocuments: React.FC = () => (
  <DocumentManagement
    entityType="ADMISSION"
    title="Admission Documents"
    description="Documents submitted during admission process."
    entityIdLabel="Admission ID"
  />
);
