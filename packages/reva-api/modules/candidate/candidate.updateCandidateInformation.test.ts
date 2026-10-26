import { Country, Department } from "@prisma/client";

import { NOT_AUTHORIZED_CANDIDACY_MANAGE } from "@/modules/shared/security/messages";
import { prismaClient } from "@/prisma/client";
import { authorizationHeaderForUser } from "@/test/helpers/authorization-helper";
import { createCandidacyHelper } from "@/test/helpers/entities/create-candidacy-helper";
import { createCertificationAuthorityHelper } from "@/test/helpers/entities/create-certification-authority-helper";
import { createOrganismHelper } from "@/test/helpers/entities/create-organism-helper";
import { injectGraphql } from "@/test/helpers/graphql-helper";

import * as SendNewEmailCandidateEmailModule from "../candidacy/emails/sendNewEmailCandidateEmail";
import * as SendPreviousEmailCandidateEmailModule from "../candidacy/emails/sendPreviousEmailCandidateEmail";

const mockAdminKeycloakUuid = "1b0e7046-ca61-4259-b716-785f36ab79b2";

const getDefaultUpdatedCandidateFields = async () => {
  const pasDeCalais = (await prismaClient.department.findUnique({
    where: { code: "62" },
  })) as Department;

  const france = (await prismaClient.country.findUnique({
    where: { label: "France" },
  })) as Country;

  return {
    gender: "undisclosed",
    lastname: "newLastName",
    givenName: "newGivenName",
    firstname: "newFirstName",
    firstname2: "newFirstName2",
    firstname3: "newFirstName3",
    middleNames: "newFirstName2 newFirstName3",
    birthdate: "1990-01-01",
    birthCity: "newBirthCity",
    birthDepartmentId: pasDeCalais.id,
    countryId: france.id,
    nationality: "newNationality",
    street: "newStreet",
    zip: "44000",
    city: "Nantes",
    phone: "+336060606",
    addressComplement: "newAddressComplement",
    email: "newEmail",
  };
};

describe("candidate information update", () => {
  test("should update all fields of candidate information", async () => {
    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }

    const updatedCandidateFields = await getDefaultUpdatedCandidateFields();

    const { birthDepartmentId, countryId, ...expectedResult } = {
      ...updatedCandidateFields,
      birthDepartment: { id: updatedCandidateFields.birthDepartmentId },
      country: { id: updatedCandidateFields.countryId },
    };

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: mockAdminKeycloakUuid,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: updatedCandidateFields,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields:
          "{ gender, lastname, givenName, firstname, firstname2, firstname3, middleNames, birthdate, birthCity, birthDepartment {id}, country{id}, nationality, street, zip, city, email, phone, addressComplement}",
      },
    });
    expect(resp.statusCode).toEqual(200);
    expect(resp.json()).not.toHaveProperty("errors");
    const obj = resp.json();
    expect(obj.data.candidate_updateCandidateInformation).toMatchObject(
      expectedResult,
    );
  });

  test("should send notification emails when updating the candidate email", async () => {
    const sendNewEmailCandidateEmailSpy = vi
      .spyOn(SendNewEmailCandidateEmailModule, "sendNewEmailCandidateEmail")
      .mockImplementation(() => Promise.resolve());

    const sendPreviousEmailCandidateEmailSpy = vi
      .spyOn(
        SendPreviousEmailCandidateEmailModule,
        "sendPreviousEmailCandidateEmail",
      )
      .mockImplementation(() => Promise.resolve());

    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }
    const updatedCandidateFields = await getDefaultUpdatedCandidateFields();

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: mockAdminKeycloakUuid,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: updatedCandidateFields,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields: "{ email }",
      },
    });
    expect(resp.statusCode).toEqual(200);
    expect(resp.json()).not.toHaveProperty("errors");
    const obj = resp.json();
    expect(obj.data.candidate_updateCandidateInformation).toMatchObject({
      email: updatedCandidateFields.email,
    });
    expect(sendNewEmailCandidateEmailSpy).toHaveBeenCalled();
    expect(sendPreviousEmailCandidateEmailSpy).toHaveBeenCalled();
  });

  test("should not send notification emails when the candidate email has not been changed", async () => {
    const sendNewEmailCandidateEmailSpy = vi
      .spyOn(SendNewEmailCandidateEmailModule, "sendNewEmailCandidateEmail")
      .mockImplementation(() => Promise.resolve());

    const sendPreviousEmailCandidateEmailSpy = vi
      .spyOn(
        SendPreviousEmailCandidateEmailModule,
        "sendPreviousEmailCandidateEmail",
      )
      .mockImplementation(() => Promise.resolve());

    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }

    const updatedCandidateFields = {
      ...(await getDefaultUpdatedCandidateFields()),
      email: candidacy.candidate.email,
    };

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: mockAdminKeycloakUuid,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: updatedCandidateFields,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields: "{ email }",
      },
    });
    expect(resp.statusCode).toEqual(200);
    expect(resp.json()).not.toHaveProperty("errors");
    const obj = resp.json();
    expect(obj.data.candidate_updateCandidateInformation).toMatchObject({
      email: candidacy.candidate.email,
    });
    expect(sendNewEmailCandidateEmailSpy).not.toHaveBeenCalled();
    expect(sendPreviousEmailCandidateEmailSpy).not.toHaveBeenCalled();
  });

  test("should update the candidate department when the zip code is updated", async () => {
    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }

    const updatedCandidateFields = await getDefaultUpdatedCandidateFields();

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: mockAdminKeycloakUuid,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: updatedCandidateFields,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields: "{ department { label } }",
      },
    });
    expect(resp.statusCode).toEqual(200);
    expect(resp.json()).not.toHaveProperty("errors");
    const obj = resp.json();
    expect(obj.data.candidate_updateCandidateInformation).toMatchObject({
      department: { label: "Loire-Atlantique" },
    });
  });

  test("should refresh certificationAuthorityId to match the candidate's new department (not the previous one) when the address changes", async () => {
    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }

    // A certification authority matching the candidate's current department (Paris, "75")
    const previousDepartmentCertificationAuthority =
      await createCertificationAuthorityHelper({
        certificationAuthorityOnCertification: {
          create: { certificationId: candidacy.certificationId! },
        },
        certificationAuthorityOnDepartment: {
          create: { departmentId: candidacy.candidate.departmentId! },
        },
      });

    // A certification authority matching the department the candidate is moving to (Loire-Atlantique, zip 44000)
    const loireAtlantique = (await prismaClient.department.findUnique({
      where: { code: "44" },
    })) as Department;
    const newDepartmentCertificationAuthority =
      await createCertificationAuthorityHelper({
        certificationAuthorityOnCertification: {
          create: { certificationId: candidacy.certificationId! },
        },
        certificationAuthorityOnDepartment: {
          create: { departmentId: loireAtlantique.id },
        },
      });

    const updatedCandidateFields = {
      ...(await getDefaultUpdatedCandidateFields()),
      zip: "44000",
      city: "Nantes",
    };

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: mockAdminKeycloakUuid,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: updatedCandidateFields,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields: "{ department { label } }",
      },
    });
    expect(resp.statusCode).toEqual(200);
    expect(resp.json()).not.toHaveProperty("errors");

    const updatedCandidacy = await prismaClient.candidacy.findUnique({
      where: { id: candidacy.id },
    });
    expect(updatedCandidacy?.certificationAuthorityId).toEqual(
      newDepartmentCertificationAuthority.id,
    );
    expect(updatedCandidacy?.certificationAuthorityId).not.toEqual(
      previousDepartmentCertificationAuthority.id,
    );
  });

  test("should allow email update when candidate is FranceConnect-linked", async () => {
    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }

    // Marquer le candidat comme lié France Connect
    await prismaClient.candidate.update({
      where: { id: candidacy.candidate.id },
      data: { franceConnectLinked: true },
    });

    const newEmail = "fc-linked-new-email@example.com";
    const updatedCandidateFields = {
      ...(await getDefaultUpdatedCandidateFields()),
      email: newEmail,
    };

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: mockAdminKeycloakUuid,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: updatedCandidateFields,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields: "{ email }",
      },
    });
    expect(resp.statusCode).toEqual(200);
    expect(resp.json()).not.toHaveProperty("errors");
    const obj = resp.json();
    expect(obj.data.candidate_updateCandidateInformation.email).toBe(newEmail);
  });

  test("should block pivot fields update when candidate is FranceConnect-linked", async () => {
    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }

    const originalCandidate = candidacy.candidate;

    // Marquer le candidat comme lié France Connect
    await prismaClient.candidate.update({
      where: { id: candidacy.candidate.id },
      data: { franceConnectLinked: true },
    });

    const updatedCandidateFields = await getDefaultUpdatedCandidateFields();

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: mockAdminKeycloakUuid,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: updatedCandidateFields,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields: "{ firstname lastname birthdate }",
      },
    });
    expect(resp.statusCode).toEqual(200);
    expect(resp.json()).not.toHaveProperty("errors");
    const obj = resp.json();
    // Les champs pivot ne doivent pas avoir changé
    expect(obj.data.candidate_updateCandidateInformation.firstname).toBe(
      originalCandidate.firstname,
    );
    expect(obj.data.candidate_updateCandidateInformation.lastname).toBe(
      originalCandidate.lastname,
    );
  });

  test("should allow birthCity update when candidate is FranceConnect-linked with non-France country", async () => {
    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }

    const canada = (await prismaClient.country.findFirst({
      where: { label: { not: "France" } },
    })) as Country;

    // Marquer le candidat comme lié France Connect avec un pays non-France
    await prismaClient.candidate.update({
      where: { id: candidacy.candidate.id },
      data: { franceConnectLinked: true, countryId: canada.id },
    });

    const { birthDepartmentId, ...baseFields } =
      await getDefaultUpdatedCandidateFields();
    const updatedCandidateFields = {
      ...baseFields,
      birthCity: "Montreal",
      countryId: canada.id,
    };

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: mockAdminKeycloakUuid,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: updatedCandidateFields,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields: "{ birthCity }",
      },
    });
    expect(resp.statusCode).toEqual(200);
    expect(resp.json()).not.toHaveProperty("errors");
    const obj = resp.json();
    expect(obj.data.candidate_updateCandidateInformation.birthCity).toBe(
      "Montreal",
    );
  });

  test("should allow birthCity and birthDepartmentId update when candidate is FranceConnect-linked with France country", async () => {
    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }

    const france = (await prismaClient.country.findUnique({
      where: { label: "France" },
    })) as Country;
    const pasDeCalais = (await prismaClient.department.findUnique({
      where: { code: "62" },
    })) as Department;

    // Marquer le candidat comme lié France Connect avec la France
    await prismaClient.candidate.update({
      where: { id: candidacy.candidate.id },
      data: { franceConnectLinked: true, countryId: france.id },
    });

    const updatedCandidateFields = {
      ...(await getDefaultUpdatedCandidateFields()),
      birthCity: "Lille",
      birthDepartmentId: pasDeCalais.id,
    };

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: mockAdminKeycloakUuid,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: updatedCandidateFields,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields: "{ birthCity birthDepartment { id } }",
      },
    });
    expect(resp.statusCode).toEqual(200);
    expect(resp.json()).not.toHaveProperty("errors");
    const obj = resp.json();
    expect(obj.data.candidate_updateCandidateInformation.birthCity).toBe(
      "Lille",
    );
    expect(
      obj.data.candidate_updateCandidateInformation.birthDepartment?.id,
    ).toBe(pasDeCalais.id);
  });

  test("should block birthdate and countryId updates when candidate is FranceConnect-linked", async () => {
    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }

    const france = (await prismaClient.country.findUnique({
      where: { label: "France" },
    })) as Country;
    const originalBirthdate = new Date("1985-03-10");

    await prismaClient.candidate.update({
      where: { id: candidacy.candidate.id },
      data: {
        franceConnectLinked: true,
        countryId: france.id,
        birthdate: originalBirthdate,
      },
    });

    const otherCountry = (await prismaClient.country.findFirst({
      where: { label: { not: "France" } },
    })) as Country;

    const updatedCandidateFields = {
      ...(await getDefaultUpdatedCandidateFields()),
      birthdate: "1990-01-01",
      countryId: otherCountry.id,
    };

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: mockAdminKeycloakUuid,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: updatedCandidateFields,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields: "{ birthdate country { id } }",
      },
    });
    expect(resp.statusCode).toEqual(200);
    expect(resp.json()).not.toHaveProperty("errors");
    const obj = resp.json();
    expect(obj.data.candidate_updateCandidateInformation.country?.id).toBe(
      france.id,
    );
    // birthdate doit conserver la valeur originale (non modifiée par la mutation)
    const storedCandidate = await prismaClient.candidate.findUnique({
      where: { id: candidacy.candidate.id },
    });
    expect(storedCandidate?.birthdate?.toISOString().slice(0, 10)).toBe(
      "1985-03-10",
    );
  });

  test("should reject with a business error when FranceConnect-linked candidate with France country submits an invalid birthDepartmentId", async () => {
    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }

    const france = (await prismaClient.country.findUnique({
      where: { label: "France" },
    })) as Country;

    await prismaClient.candidate.update({
      where: { id: candidacy.candidate.id },
      data: { franceConnectLinked: true, countryId: france.id },
    });

    const updatedCandidateFields = {
      ...(await getDefaultUpdatedCandidateFields()),
      birthDepartmentId: "00000000-0000-4000-8000-000000000000",
    };

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: mockAdminKeycloakUuid,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: updatedCandidateFields,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields: "{ birthDepartment { id } }",
      },
    });
    expect(resp.statusCode).toEqual(200);
    const obj = resp.json();
    expect(obj).toHaveProperty("errors");
    expect(obj.errors[0].message).toBe(
      "Le département de naissance n'existe pas",
    );
  });

  test("should preserve an existing birthDepartmentId when FranceConnect-linked candidate with non-France country updates without passing birthDepartmentId", async () => {
    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }

    const otherCountry = (await prismaClient.country.findFirst({
      where: { label: { not: "France" } },
    })) as Country;
    const pasDeCalais = (await prismaClient.department.findUnique({
      where: { code: "62" },
    })) as Department;

    // Donnée héritée : candidat FC non-France avec un birthDepartmentId français historique
    await prismaClient.candidate.update({
      where: { id: candidacy.candidate.id },
      data: {
        franceConnectLinked: true,
        countryId: otherCountry.id,
        birthDepartmentId: pasDeCalais.id,
      },
    });

    const { birthDepartmentId, ...fieldsWithoutDepartment } =
      await getDefaultUpdatedCandidateFields();

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: mockAdminKeycloakUuid,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: fieldsWithoutDepartment,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields: "{ birthDepartment { id } }",
      },
    });
    expect(resp.statusCode).toEqual(200);
    expect(resp.json()).not.toHaveProperty("errors");
    const obj = resp.json();
    // birthDepartmentId n'est pas dans l'input → il ne doit pas être modifié
    expect(
      obj.data.candidate_updateCandidateInformation.birthDepartment?.id,
    ).toBe(pasDeCalais.id);
  });

  test("should force birthDepartmentId to null when FranceConnect-linked candidate with non-France country submits a department id", async () => {
    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }

    const otherCountry = (await prismaClient.country.findFirst({
      where: { label: { not: "France" } },
    })) as Country;
    const pasDeCalais = (await prismaClient.department.findUnique({
      where: { code: "62" },
    })) as Department;

    await prismaClient.candidate.update({
      where: { id: candidacy.candidate.id },
      data: {
        franceConnectLinked: true,
        countryId: otherCountry.id,
      },
    });

    const updatedCandidateFields = {
      ...(await getDefaultUpdatedCandidateFields()),
      birthDepartmentId: pasDeCalais.id,
    };

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: mockAdminKeycloakUuid,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: updatedCandidateFields,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields: "{ birthDepartment { id } }",
      },
    });
    expect(resp.statusCode).toEqual(200);
    expect(resp.json()).not.toHaveProperty("errors");
    const obj = resp.json();
    expect(
      obj.data.candidate_updateCandidateInformation.birthDepartment,
    ).toBeNull();
  });

  test("should be able to update a candidate zipcode with an overseas terrtory zip code", async () => {
    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }

    const updatedCandidateFields = {
      ...(await getDefaultUpdatedCandidateFields()),
      zip: "97100",
    };

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: mockAdminKeycloakUuid,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: updatedCandidateFields,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields: "{ department { label } }",
      },
    });
    expect(resp.statusCode).toEqual(200);
    expect(resp.json()).not.toHaveProperty("errors");
    const obj = resp.json();
    expect(obj.data.candidate_updateCandidateInformation).toMatchObject({
      department: { label: "Guadeloupe" },
    });
  });

  test("affecte le bon département à un candidat qui n'en avait pas quand on renseigne son code postal", async () => {
    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }

    await prismaClient.candidate.update({
      where: { id: candidacy.candidate.id },
      data: { departmentId: null },
    });

    const updatedCandidateFields = {
      ...(await getDefaultUpdatedCandidateFields()),
      zip: "44000",
    };

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "admin",
        keycloakId: mockAdminKeycloakUuid,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: updatedCandidateFields,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields: "{ department { label } }",
      },
    });
    expect(resp.statusCode).toEqual(200);
    expect(resp.json()).not.toHaveProperty("errors");
    const obj = resp.json();
    expect(obj.data.candidate_updateCandidateInformation).toMatchObject({
      department: { label: "Loire-Atlantique" },
    });
  });

  test("should not allow an aap to update candidate information if it is not the owner of the candidacy", async () => {
    const nonOwnerOrganism = await createOrganismHelper();
    const candidacy = await createCandidacyHelper();

    if (!candidacy || !candidacy.candidate) {
      throw Error("Error while creating test candidacy");
    }

    const updatedCandidateFields = await getDefaultUpdatedCandidateFields();

    const resp = await injectGraphql({
      fastify: global.testApp,
      authorization: authorizationHeaderForUser({
        role: "manage_candidacy",
        keycloakId: nonOwnerOrganism.organismOnAccounts[0].account.keycloakId,
      }),
      payload: {
        requestType: "mutation",
        arguments: {
          candidacyId: candidacy.id,
          candidateInformation: updatedCandidateFields,
        },
        enumFields: ["gender"],
        endpoint: "candidate_updateCandidateInformation",
        returnFields: "{ email }",
      },
    });
    expect(resp.statusCode).toEqual(200);
    const obj = resp.json();
    expect(obj).toHaveProperty("errors");
    expect(obj.errors[0].message).toBe(NOT_AUTHORIZED_CANDIDACY_MANAGE);
  });
});
