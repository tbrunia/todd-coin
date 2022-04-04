import _ from "lodash";

export const buildWhere = (
  criteria: Record<string, string | number | boolean>,
  initialValue?: Record<string, string | number | boolean>
) =>
  _.keys(criteria).reduce(
    (accumulator: Record<string, string | number | boolean>, key: string) => {
      if (criteria[key] !== undefined) {
        return {
          ...accumulator,
          [key]: criteria[key],
        };
      }
      return accumulator;
    },
    initialValue || {}
  );
