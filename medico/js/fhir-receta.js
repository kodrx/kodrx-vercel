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

  return {
    resourceType: "Bundle",
    type: "collection",
    id: `kodrx-receta-${recetaId}`,
    timestamp: new Date().toISOString(),
    entry: [
      patientResource,
      practitionerResource,
      ...medicamentosFHIR
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
