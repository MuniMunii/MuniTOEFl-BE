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
    collection: "meta_tests",
    indexes: [
      {
        keys: { type: 1, titleSlug: 1 },
        options: { unique: true },
      },
      {keys:{published:1,type:1,createdAt:-1}}
    ],
  },
  {
    collection:"questions_test",
    indexes:[
      {
        keys:{testId:1,order:1},
        options:{unique:true}
      }
    ]
  },
  {
    collection:"attempt_tests",
    indexes:[
      {
        keys:{testId:1,userId:1},
        options:{unique:true,partialFilterExpression:{
          status:'in_progress'
        }}
      },
      {keys:{testId:1,userId:1,status:1,expiresAt:1}},
      {keys:{testId:1,userId:1,"answer.questionId":1}},
    ]
  }
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
