export interface QualityProfile {
  tier: 'interaction' | 'balanced' | 'high';
  steps: number;
  pixelRatio: number;
}

export interface AdaptiveQualityOptions {
  devicePixelRatio?: number;
  initialTier?: QualityProfile['tier'];
}

export function getEffectivePixelRatio(profile: QualityProfile, devicePixelRatio: number): number;

export class AdaptiveQualityController {
  constructor(options?: AdaptiveQualityOptions);
  profile: QualityProfile;
  readonly pixelRatio: number;
  update(frameTimeMs: number, interacting?: boolean): QualityProfile;
}
