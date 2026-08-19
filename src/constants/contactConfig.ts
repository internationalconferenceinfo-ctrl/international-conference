export interface ContactInfo {
  email: string;
  phone: string;
  address: string;
}

export interface SocialLinks {
  facebook: string;
  instagram: string;
  linkedin: string;
  twitter: string;
  other: string;
}

export const OFFICIAL_CONTACT_INFO: ContactInfo = {
  email: "ops@internationalconference.org",
  phone: "+1 (555) 304-4581",
  address: "500 Innovation Way, Suite 400, Boston, MA 02108, USA"
};

export const OFFICIAL_SOCIAL_LINKS: SocialLinks = {
  facebook: "",
  instagram: "",
  linkedin: "",
  twitter: "",
  other: ""
};
