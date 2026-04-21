import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PortalBranding {
  portalName: string;
  portalLogoUrl: string | null;
}

const DEFAULT_BRANDING: PortalBranding = {
  portalName: 'LifeOS',
  portalLogoUrl: null,
};

export function usePortalBranding() {
  const [branding, setBranding] = useState<PortalBranding>(DEFAULT_BRANDING);

  useEffect(() => {
    let mounted = true;

    const loadBranding = async () => {
      try {
        const { data } = await supabase
          .from('app_settings')
          .select('portal_name, portal_logo_url')
          .eq('id', 'default')
          .maybeSingle();

        if (!mounted || !data) return;

        setBranding({
          portalName: data.portal_name?.trim() || DEFAULT_BRANDING.portalName,
          portalLogoUrl: data.portal_logo_url?.trim() || null,
        });
      } catch {
        // Keep defaults when branding settings are not available.
      }
    };

    loadBranding();

    return () => {
      mounted = false;
    };
  }, []);

  return branding;
}
