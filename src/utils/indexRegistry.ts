import type { IndexSpecification, CreateIndexesOptions } from "mongodb";

type IndexDefinition = {
  keys: IndexSpecification;
  options?: CreateIndexesOptions;
};

type CollectionIndexes = {
  collection: string;
  indexes: IndexDefinition[];
};
export const indexRegistry: CollectionIndexes[] = [
  {
    collection: "meta-tests",
    indexes: [
      {
        keys: { type: 1, titleSlug: 1 },
        options: { unique: true },
      },
    ],
  },
/**
 * @Example
 *   {
    collection: "users",
    indexes: [
      {
        keys: { email: 1 },
        options: { unique: true },
      },
    ],
  },
 */
];
