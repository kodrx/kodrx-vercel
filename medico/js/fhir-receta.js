export function recetaToFHIR(receta) {
  const recetaId = receta.id || crypto.randomUUID();

  const patientResource = {
    fullUrl: `urn:uuid:patient-${recetaId}`,
    resource: {
      resourceType: "Patient",
      id: `patient-${recetaId}`,
      name: [
        {
          text:
            receta.paciente?.nombre ||
            receta.nombrePaciente ||
            receta.pacienteNombre ||
            "Paciente KodRx"
        }
      ],
      gender: normalizarSexoFHIR(
        receta.paciente?.sexo ||
        receta.sexo ||
        receta.pacienteSexo
      )
    }
  };

  const practitionerResource = {
    fullUrl: `urn:uuid:practitioner-${recetaId}`,
    resource: {
      resourceType: "Practitioner",
      id: `practitioner-${recetaId}`,
      name: [
        {
          text:
            receta.medico?.nombre ||
            receta.medicoNombre ||
            "Médico KodRx"
        }
      ],
      identifier: [
        {
          system: "https://www.gob.mx/cedulaprofesional",
          value:
            receta.medico?.cedula ||
            receta.medicoCedula ||
            receta.cedulaProfesional ||
            ""
        }
      ]
    }
  };

  const medicamentosFHIR = (receta.medicamentos || []).map((med, idx) => ({
    fullUrl: `urn:uuid:medicationrequest-${recetaId}-${idx + 1}`,
    resource: {
      resourceType: "MedicationRequest",
      id: `medicationrequest-${recetaId}-${idx + 1}`,
      status: "active",
      intent: "order",
      subject: {
        reference: `Patient/patient-${recetaId}`
      },
      requester: {
        reference: `Practitioner/practitioner-${recetaId}`
      },
      authoredOn: receta.fecha || new Date().toISOString(),
      medicationCodeableConcept: {
        text: med.nombre || "Medicamento"
      },
      dosageInstruction: [
        {
          text: [
            med.dosis ? `Dosis: ${med.dosis}` : "",
            med.duracion ? `Duración: ${med.duracion}` : "",
            receta.indicaciones ? `Indicaciones: ${receta.indicaciones}` : ""
          ]
            .filter(Boolean)
            .join(" | ")
        }
      ]
    }
  }));
  
const observacionesFHIR = crearObservacionesFHIR(receta, recetaId);
const conditionFHIR = crearConditionFHIR(receta, recetaId);
const provenanceFHIR = crearProvenanceFHIR(receta, recetaId);
  
  
  return {
    resourceType: "Bundle",
    type: "collection",
    id: `kodrx-receta-${recetaId}`,
    timestamp: new Date().toISOString(),
 entry: [
  patientResource,
  practitionerResource,
  ...medicamentosFHIR,
  ...observacionesFHIR,
  conditionFHIR,
  provenanceFHIR
].filter(Boolean)
  };
}

function normalizarSexoFHIR(sexo) {
  if (!sexo) return "unknown";

  const s = String(sexo).trim().toLowerCase();

  if (s === "m" || s === "masculino" || s === "hombre") return "male";
  if (s === "f" || s === "femenino" || s === "mujer") return "female";

  return "unknown";
}
function crearObservacionesFHIR(receta, recetaId) {
  const paciente = receta.paciente || {};

  const peso = paciente.peso ?? receta.peso;
  const talla = paciente.talla ?? receta.talla;
  const temperatura = paciente.temperatura ?? receta.temperatura;
  const presion = paciente.presion ?? receta.presion;
  const imc = paciente.imc ?? receta.imc;

  const authoredOn = receta.fecha || new Date().toISOString();

  return [
    crearObservationSimple({
      recetaId,
      id: "peso",
      code: "29463-7",
      display: "Body weight",
      value: extraerNumero(peso),
      unit: "kg",
      system: "http://unitsofmeasure.org",
      codeUnit: "kg",
      authoredOn
    }),

    crearObservationSimple({
      recetaId,
      id: "talla",
      code: "8302-2",
      display: "Body height",
      value: extraerNumero(talla),
      unit: "cm",
      system: "http://unitsofmeasure.org",
      codeUnit: "cm",
      authoredOn
    }),

    crearObservationSimple({
      recetaId,
      id: "temperatura",
      code: "8310-5",
      display: "Body temperature",
      value: extraerNumero(temperatura),
      unit: "°C",
      system: "http://unitsofmeasure.org",
      codeUnit: "Cel",
      authoredOn
    }),

    crearObservationSimple({
      recetaId,
      id: "imc",
      code: "39156-5",
      display: "Body mass index",
      value: extraerNumero(imc),
      unit: "kg/m2",
      system: "http://unitsofmeasure.org",
      codeUnit: "kg/m2",
      authoredOn
    }),

    crearObservationTexto({
      recetaId,
      id: "presion-arterial",
      code: "85354-9",
      display: "Blood pressure panel",
      text: presion,
      authoredOn
    })
  ].filter(Boolean);
}

function crearObservationSimple({
  recetaId,
  id,
  code,
  display,
  value,
  unit,
  system,
  codeUnit,
  authoredOn
}) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;

  return {
    fullUrl: `urn:uuid:observation-${recetaId}-${id}`,
    resource: {
      resourceType: "Observation",
      id: `observation-${recetaId}-${id}`,
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "vital-signs",
              display: "Vital Signs"
            }
          ]
        }
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code,
            display
          }
        ],
        text: display
      },
      subject: {
        reference: `Patient/patient-${recetaId}`
      },
      effectiveDateTime: authoredOn,
      valueQuantity: {
        value,
        unit,
        system,
        code: codeUnit
      }
    }
  };
}

function crearObservationTexto({
  recetaId,
  id,
  code,
  display,
  text,
  authoredOn
}) {
  if (!text) return null;

  return {
    fullUrl: `urn:uuid:observation-${recetaId}-${id}`,
    resource: {
      resourceType: "Observation",
      id: `observation-${recetaId}-${id}`,
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "vital-signs",
              display: "Vital Signs"
            }
          ]
        }
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code,
            display
          }
        ],
        text: display
      },
      subject: {
        reference: `Patient/patient-${recetaId}`
      },
      effectiveDateTime: authoredOn,
      valueString: String(text)
    }
  };
}

function extraerNumero(valor) {
  if (valor === null || valor === undefined || valor === "") return null;

  const limpio = String(valor)
    .replace(",", ".")
    .match(/[\d.]+/);

  return limpio ? Number(limpio[0]) : null;
}
function crearConditionFHIR(receta, recetaId) {
  const diagnostico =
    receta.diagnostico ||
    receta.dx ||
    receta.condition ||
    "";

  if (!diagnostico) return null;

  const authoredOn = receta.fecha || new Date().toISOString();

  return {
    fullUrl: `urn:uuid:condition-${recetaId}`,
    resource: {
      resourceType: "Condition",
      id: `condition-${recetaId}`,
      clinicalStatus: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            code: "active",
            display: "Active"
          }
        ]
      },
      verificationStatus: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
            code: "unconfirmed",
            display: "Unconfirmed"
          }
        ]
      },
      code: {
        text: diagnostico
      },
      subject: {
        reference: `Patient/patient-${recetaId}`
      },
      recorder: {
        reference: `Practitioner/practitioner-${recetaId}`
      },
      recordedDate: authoredOn
    }
  };
}
function crearProvenanceFHIR(receta, recetaId) {

  const hash =
    receta.hash ||
    receta.blockchain?.hash ||
    null;

  const bloque =
    receta.bloque ||
    receta.blockchain?.block ||
    null;

  const fecha =
    receta.fecha ||
    new Date().toISOString();

  return {
    fullUrl: `urn:uuid:provenance-${recetaId}`,
    resource: {
      resourceType: "Provenance",

      id: `provenance-${recetaId}`,

      recorded: fecha,

      target: crearTargetsProvenance(receta, recetaId),
      
      agent: [
        {
          who: {
            reference: `Practitioner/practitioner-${recetaId}`
          }
        }
      ],

      extension: [

        ...(hash ? [{
          url: "https://kodrx.app/fhir/hash",
          valueString: hash
        }] : []),

        ...(bloque ? [{
          url: "https://kodrx.app/fhir/block",
          valueInteger: Number(bloque)
        }] : []),

        [{
          url: "https://kodrx.app/fhir/recetaId",
          valueString: recetaId
        }]

      ].flat()
    }
  };
}
function crearTargetsProvenance(receta, recetaId) {
  const medicamentos = receta.medicamentos || [];
  const paciente = receta.paciente || {};

  const tienePeso = paciente.peso ?? receta.peso;
  const tieneTalla = paciente.talla ?? receta.talla;
  const tieneTemperatura = paciente.temperatura ?? receta.temperatura;
  const tieneIMC = paciente.imc ?? receta.imc;
  const tienePresion = paciente.presion ?? receta.presion;
  const tieneDiagnostico = receta.diagnostico || receta.dx || receta.condition;

  return [
    { reference: `Patient/patient-${recetaId}` },
    { reference: `Practitioner/practitioner-${recetaId}` },

    ...medicamentos.map((_, idx) => ({
      reference: `MedicationRequest/medicationrequest-${recetaId}-${idx + 1}`
    })),

    tienePeso ? { reference: `Observation/observation-${recetaId}-peso` } : null,
    tieneTalla ? { reference: `Observation/observation-${recetaId}-talla` } : null,
    tieneTemperatura ? { reference: `Observation/observation-${recetaId}-temperatura` } : null,
    tieneIMC ? { reference: `Observation/observation-${recetaId}-imc` } : null,
    tienePresion ? { reference: `Observation/observation-${recetaId}-presion-arterial` } : null,
    tieneDiagnostico ? { reference: `Condition/condition-${recetaId}` } : null
  ].filter(Boolean);
}
