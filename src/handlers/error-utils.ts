import { ValidationErrorItem } from "joi";

export const buildInvalidAttributeError = (errorItem: ValidationErrorItem) => {
  const buildPointer = (errorItem: ValidationErrorItem): string => {
    let label = "";
    for (const segment of errorItem.path) {
      if (typeof segment === "object") {
        continue;
      }

      if (typeof segment === "string") {
        if (label) {
          label += ".";
        }

        label += segment;
      } else {
        label += `[${segment}]`;
      }
    }

    return label;
  };

  return {
    status: "400",
    title: "Invalid Attribute",
    source: {
      pointer: buildPointer(errorItem),
    },
    description: errorItem.message,
  };
};

export const buildInvalidQueryError = (errorItem: ValidationErrorItem) => {
  return {
    status: "400",
    title: "Invalid Query Parameter",
    description: errorItem.message,
    parameter: errorItem.context.key,
  };
};

export const buildInvalidParameterError = (errorItem: ValidationErrorItem) => {
  return {
    status: "400",
    title: "Invalid Path Parameter",
    description: errorItem.message,
  };
};

export const buildUnauthorizedError = (detail: string) => {
  return {
    status: "401",
    title: "Unauthorized",
    detail,
  };
};

export const buildInternalServerError = () => {
  return {
    status: "500",
    title: "Internal Server Error",
  };
};

export const buildNofFountError = (detail: string) => {
  return {
    status: "404",
    title: "Not Found",
    detail,
  };
};
