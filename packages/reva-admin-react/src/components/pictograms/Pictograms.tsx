/** Forked from https://github.com/SocialGouv/mda/blob/main/apps/web/src/components/pictos/index.tsx
 *  Apache License 2.0 https://github.com/SocialGouv/mda/blob/main/LICENSE
 *  Copyright 2023 Direction du numérique des ministère sociaux
 *  Changes :
 *  - rename PICTOS to PICTOGRAMS
 *  - add custom sizes
 */

import cityHall, {
  SVG,
} from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/buildings/city-hall.svg";
import factory from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/buildings/factory.svg";
import house from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/buildings/house.svg";
import nuclearPlant from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/buildings/nuclear-plant.svg";
import school from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/buildings/school.svg";
import application from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/digital/application.svg";
import avatar from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/digital/avatar.svg";
import calendar from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/digital/calendar.svg";
import coding from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/digital/coding.svg";
import dataVisualization from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/digital/data-visualization.svg";
import internet from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/digital/internet.svg";
import mailSend from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/digital/mail-send.svg";
import search from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/digital/search.svg";
import contract from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/document/contract.svg";
import documentDownload from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/document/document-download.svg";
import documentSignature from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/document/document-signature.svg";
import document from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/document/document.svg";
import drivingLicence from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/document/driving-licence.svg";
import nationalIdentityCard from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/document/national-identity-card.svg";
import passport from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/document/passport.svg";
import taxStamp from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/document/tax-stamp.svg";
import vehicleRegistration from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/document/vehicle-registration.svg";
import environment from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/environment/environment.svg";
import food from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/environment/food.svg";
import grocery from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/environment/grocery.svg";
import humanCooperation from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/environment/human-cooperation.svg";
import leaf from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/environment/leaf.svg";
import moon from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/environment/moon.svg";
import mountain from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/environment/mountain.svg";
import sun from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/environment/sun.svg";
import tree from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/environment/tree.svg";
import health from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/health/health.svg";
import hospital from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/health/hospital.svg";
import vaccine from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/health/vaccine.svg";
import virus from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/health/virus.svg";
import firefighter from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/institutions/firefighter.svg";
import gendarmerie from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/institutions/gendarmerie.svg";
import justice from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/institutions/justice.svg";
import money from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/institutions/money.svg";
import police from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/institutions/police.svg";
import book from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/leisure/book.svg";
import community from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/leisure/community.svg";
import culture from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/leisure/culture.svg";
import digitalArt from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/leisure/digital-art.svg";
import paint from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/leisure/paint.svg";
import airport from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/map/airport.svg";
import locationFrance from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/map/location-france.svg";
import luggage from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/map/luggage.svg";
import map from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/map/map.svg";
import connectionLost from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/system/connection-lost.svg";
import error from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/system/error.svg";
import information from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/system/information.svg";
import notification from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/system/notification.svg";
import padlock from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/system/padlock.svg";
import success from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/system/success.svg";
import system from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/system/system.svg";
import technicalError from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/system/technical-error.svg";
import warning from "@codegouvfr/react-dsfr/dsfr/artwork/pictograms/system/warning.svg";

const generateSvg = (
  svg: SVG,
  customSize?: { width: number; height: number },
) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={`${customSize ? customSize.width : svg.width}px`}
    height={`${customSize ? customSize.height : svg.height}px`}
    viewBox={`0 0 ${svg.width} ${svg.height}`}
    className="fr-artwork"
    aria-hidden="true"
  >
    <style>{`
            .fr-artwork-decorative {
                fill: var(--blue-france-925-125);
            }
            .fr-artwork-minor {
                fill: var(--red-marianne-425-625);
            }
            .fr-artwork-major {
                fill: var(--blue-france-sun-113-625);
            }
        `}</style>
    <use
      xlinkHref={`${svg.src}#artwork-decorative`}
      className="fr-artwork-decorative"
    />
    <use xlinkHref={`${svg.src}#artwork-minor`} className="fr-artwork-minor" />
    <use xlinkHref={`${svg.src}#artwork-major`} className="fr-artwork-major" />
  </svg>
);

export const PICTOGRAMS = {
  cityHall: generateSvg(cityHall),
  factory: generateSvg(factory),
  house: generateSvg(house),
  nuclearPlant: generateSvg(nuclearPlant),
  school: generateSvg(school),
  application: generateSvg(application),
  avatar: generateSvg(avatar),
  avatarSmall: generateSvg(avatar, { width: 40, height: 40 }),
  calendar: generateSvg(calendar),
  coding: generateSvg(coding),
  dataVisualization: generateSvg(dataVisualization),
  dataVisualizationSmall: generateSvg(dataVisualization, {
    width: 40,
    height: 40,
  }),
  internet: generateSvg(internet),
  mailSend: generateSvg(mailSend),
  search: generateSvg(search),
  searchLG: generateSvg(search, { width: 98, height: 98 }),
  contract: generateSvg(contract),
  contractSmall: generateSvg(contract, { width: 40, height: 40 }),
  documentDownload: generateSvg(documentDownload),
  documentSignature: generateSvg(documentSignature),
  document: generateSvg(document),
  drivingLicence: generateSvg(drivingLicence),
  nationalIdentityCard: generateSvg(nationalIdentityCard),
  passport: generateSvg(passport),
  taxStamp: generateSvg(taxStamp),
  vehicleRegistration: generateSvg(vehicleRegistration),
  environment: generateSvg(environment),
  food: generateSvg(food),
  grocery: generateSvg(grocery),
  humanCooperation: generateSvg(humanCooperation),
  leaf: generateSvg(leaf),
  moon: generateSvg(moon),
  mountain: generateSvg(mountain),
  sun: generateSvg(sun),
  tree: generateSvg(tree),
  health: generateSvg(health),
  hospital: generateSvg(hospital),
  vaccine: generateSvg(vaccine),
  virus: generateSvg(virus),
  firefighter: generateSvg(firefighter),
  gendarmerie: generateSvg(gendarmerie),
  justice: generateSvg(justice),
  money: generateSvg(money),
  police: generateSvg(police),
  book: generateSvg(book),
  community: generateSvg(community),
  culture: generateSvg(culture),
  digitalArt: generateSvg(digitalArt),
  paint: generateSvg(paint),
  airport: generateSvg(airport),
  locationFrance: generateSvg(locationFrance),
  luggage: generateSvg(luggage),
  map: generateSvg(map),
  connectionLost: generateSvg(connectionLost),
  error: generateSvg(error),
  errorSmall: generateSvg(error, { width: 40, height: 40 }),
  information: generateSvg(information),
  notification: generateSvg(notification),
  padlock: generateSvg(padlock),
  padlockXL: generateSvg(padlock, { width: 142, height: 142 }),
  success: generateSvg(success),
  successLg: generateSvg(success, { width: 120, height: 120 }),
  system: generateSvg(system),
  technicalError: generateSvg(technicalError),
  technicalErrorLG: generateSvg(technicalError, { width: 120, height: 120 }),
  warning: generateSvg(warning),
  warningLG: generateSvg(warning, { width: 120, height: 120 }),
};
