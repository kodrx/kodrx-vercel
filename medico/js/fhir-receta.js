export function recetaToFHIR(receta) {
  const recetaId = receta.id || crypto.randomUUID();

  return {
    resourceType: "Bundle",
    type: "collection",
    id: `kodrx-receta-${recetaId}`,
    timestamp: new Date().toISOString(),
    entry: [
      {
        fullUrl: `urn:uuid:patient-${recetaId}`,
        resource: {
          resourceType: "Patient",
          id: `patient-${recetaId}`,
          name: [
            {
              text: receta.pacienteNombre || "Paciente KodRx"
            }
          ],
          gender: normalizarSexoFHIR(receta.pacienteSexo),
          birthDate: receta.pacienteFechaNacimiento || undefined
        }
      },
      {
        fullUrl: `urn:uuid:practitioner-${recetaId}`,
        resource: {
          resourceType: "Practitioner",
          id: `practitioner-${recetaId}`,
          name: [
            {
              text: receta.medicoNombre || "Médico KodRx"
            }
          ],
          identifier: [
            {
              system: "https://www.gob.mx/cedulaprofesional",
              value: receta.cedulaProfesional || ""
            }
          ]
        }
      },
      {
        fullUrl: `urn:uuid:medicationrequest-${recetaId}`,
        resource: {
          resourceType: "MedicationRequest",
          id: `medicationrequest-${recetaId}`,
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
            text: receta.medicamentosTexto || "Medicamento indicado en receta KodRx"
          },
          dosageInstruction: [
            {
              text: receta.indicaciones || receta.dosis || ""
            }
          ]
        }
      }
    ].filter(Boolean)
  };
}

{
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
}
