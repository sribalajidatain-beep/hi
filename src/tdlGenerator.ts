export interface TdlConfig {
  fieldName: string;
  voucherType: "Sales Invoice" | "Purchase Invoice" | "Receipt" | "Payment" | "Delivery Note";
  position: "Party Details" | "Voucher Header" | "Voucher Footer";
  dataType: "String" | "Number" | "Date" | "Amount";
  udfIndex: number;
  includeReport: boolean;
  reportType: "Day Book" | "Sales Register" | "Purchase Register";
}

export function cleanId(name: string): string {
  // Remove special characters and spaces, convert to PascalCase/Alphanumeric
  return name.replace(/[^a-zA-Z0-9]/g, "");
}

export function generateTdlCode(config: TdlConfig): string {
  const cleanFieldName = cleanId(config.fieldName);
  const udfId = `UDF_${cleanFieldName}`;
  const fieldId = `${udfId}Field`;
  const lineId = `${udfId}Line`;
  const label = config.fieldName.endsWith(":") ? config.fieldName : `${config.fieldName}:`;
  const colFieldId = `${udfId}ColField`;
  const colTitleFieldId = `${udfId}ColTitleField`;

  // 1. Data Type Mapping
  let udfType = "String";
  let fieldUse = "Name Field";
  if (config.dataType === "Number") {
    udfType = "Number";
    fieldUse = "Number Field";
  } else if (config.dataType === "Date") {
    udfType = "Date";
    fieldUse = "Short Date Field";
  } else if (config.dataType === "Amount") {
    udfType = "Amount";
    fieldUse = "Amount Field";
  }

  // 2. Position Mapping & Part Selection
  let partTarget = "EI PartyDetails";
  let positionInstruction = "Add : Line : At End : " + lineId;

  if (config.position === "Voucher Header") {
    partTarget = "VCH Top Right";
    positionInstruction = `Add : Line : At End : ${lineId}`;
  } else if (config.position === "Voucher Footer") {
    partTarget = "VCH Narration Part";
    positionInstruction = `Add : Line : Before : VCH Narration : ${lineId}`;
  } else {
    // Party Details
    if (config.voucherType === "Receipt" || config.voucherType === "Payment") {
      partTarget = "VCH PartyDetails";
    } else {
      partTarget = "EI PartyDetails";
    }
  }

  // Header Title
  let code = `;; =========================================================================
;; TallyPrime TDL Customization: Adding custom field "${config.fieldName}"
;; Generated for TallyPrime 4.x compatibility
;; =========================================================================

;; STEP 1: Define User Defined Field (UDF) for persistent database storage
[System: UDF]
    ${udfId} : ${udfType} : ${config.udfIndex}

;; STEP 2: Modify existing Tally Part to inject custom line
[#Part: ${partTarget}]
    ${positionInstruction}

;; STEP 3: Define Custom Line containing label Prompt and Input Field
[Line: ${lineId}]
    Fields : Medium Prompt, ${fieldId}
    Local : Field : Medium Prompt : Set as : "${label} "
    Space Bottom : 0.5

;; STEP 4: Define Input Field with Storage Mapping to the UDF
[Field: ${fieldId}]
    Use : ${fieldUse}
    Storage : ${udfId}
    Width : 25
    Border : Thin Box
    Show Table On Press : Yes
`;

  // 5. Add Report Columnar Integration if enabled
  if (config.includeReport) {
    let reportTitleLine = "DB Title";
    let reportBodyLine = "DB Body";
    let reportTargetDesc = "Day Book";

    if (config.reportType === "Sales Register") {
      reportTitleLine = "VCHREG Title";
      reportBodyLine = "VCHREG Body";
      reportTargetDesc = "Sales Register";
    } else if (config.reportType === "Purchase Register") {
      reportTitleLine = "VCHREG Title";
      reportBodyLine = "VCHREG Body";
      reportTargetDesc = "Purchase Register";
    }

    code += `
;; =========================================================================
;; STEP 5: Report Integration - Add Column in ${reportTargetDesc}
;; =========================================================================

;; Modify report columns title/header line
[#Line: ${reportTitleLine}]
    Add : Fields : At End : ${colTitleFieldId}

[Field: ${colTitleFieldId}]
    Use : Name Field
    Set as : "${config.fieldName}"
    Width : 15
    Style : Bold
    Align : Center
    Border : Thin Left Right

;; Modify report body row line to fetch saved value from UDF ($${udfId})
[#Line: ${reportBodyLine}]
    Add : Fields : At End : ${colFieldId}

[Field: ${colFieldId}]
    Use : ${fieldUse}
    Set as : $${udfId}
    Width : 15
    Align : Left
    Border : Thin Left Right
`;
  }

  return code;
}

export interface ModificationDetail {
  type: string;
  name: string;
  explanation: string;
}

export function getModificationDetails(config: TdlConfig): ModificationDetail[] {
  const cleanFieldName = cleanId(config.fieldName);
  const udfId = `UDF_${cleanFieldName}`;
  const fieldId = `${udfId}Field`;
  const lineId = `${udfId}Line`;
  
  let mainPart = "EI PartyDetails";
  let mainVoucherType = config.voucherType;
  
  if (config.position === "Voucher Header") {
    mainPart = "VCH Top Right";
  } else if (config.position === "Voucher Footer") {
    mainPart = "VCH Narration Part";
  } else if (config.voucherType === "Receipt" || config.voucherType === "Payment") {
    mainPart = "VCH PartyDetails";
  }

  const details: ModificationDetail[] = [
    {
      type: "System UDF Definition",
      name: `[System: UDF] -> ${udfId}`,
      explanation: `Declares a global database schema extension field '${udfId}' of type '${config.dataType}' with index ID ${config.udfIndex}. This instructs Tally's object database (ODBC) to allocate storage and persist any values entered in this field inside the Voucher object permanently.`
    },
    {
      type: "Part Override",
      name: `[#Part: ${mainPart}]`,
      explanation: `Modifies the native TallyPrime container part. Using the '#' prefix avoids overriding the original source code, safely injecting our custom line '${lineId}' into the UI layout at the specified slot.`
    },
    {
      type: "Line Definition",
      name: `[Line: ${lineId}]`,
      explanation: `Defines our custom UI row. It houses two fields: 'Medium Prompt' (a built-in Tally field which we locally set to display "${config.fieldName}:") and the actual input field '${fieldId}'.`
    },
    {
      type: "Field Definition",
      name: `[Field: ${fieldId}]`,
      explanation: `Specifies the input behavior and properties. Uses standard '${config.dataType === "String" ? "Name Field" : config.dataType === "Number" ? "Number Field" : config.dataType === "Date" ? "Short Date Field" : "Amount Field"}' rules, binds to the '${udfId}' storage, and renders with a clean thin border.`
    }
  ];

  if (config.includeReport) {
    let reportTitleLine = config.reportType === "Day Book" ? "DB Title" : "VCHREG Title";
    let reportBodyLine = config.reportType === "Day Book" ? "DB Body" : "VCHREG Body";
    
    details.push({
      type: "Report Header Modification",
      name: `[#Line: ${reportTitleLine}]`,
      explanation: `Modifies the column header of the ${config.reportType} report, adding a title labeled "${config.fieldName}" at the end of the header row.`
    });
    
    details.push({
      type: "Report Row Modification",
      name: `[#Line: ${reportBodyLine}]`,
      explanation: `Modifies the data rows of the ${config.reportType} report, inserting a new field that queries '$${udfId}' to dynamically extract and display the saved field value for each voucher item.`
    });
  }

  return details;
}
