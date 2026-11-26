// data-model.md § CheckFailure; rule codes from contracts/validator-cli.md § Rule codes.
export type RuleCode =
  | 'frontmatter-invalid'
  | 'metadata-missing'
  | 'metadata-invalid'
  | 'section-missing'
  | 'section-empty'
  | 'section-order'
  | 'section-duplicate'
  | 'section-unknown'
  | 'cost-row-missing'
  | 'related-unknown'
  | 'related-self'
  | 'id-duplicate'
  | 'id-not-in-topics'
  | 'no-cards'
  | 'topics-invalid';

export interface CheckFailure {
  file: string;
  id: string | null;
  rule: RuleCode;
  detail: string;
}
