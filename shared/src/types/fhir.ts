export interface FhirBundleEntry {
  fullUrl?: string;
  resource: {
    resourceType: string;
    id?: string;
    [key: string]: unknown;
  };
}

export interface FhirBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'collection' | 'document' | 'batch' | 'transaction';
  timestamp: string;
  entry: FhirBundleEntry[];
}
