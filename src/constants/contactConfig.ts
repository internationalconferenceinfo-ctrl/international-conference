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
  email: "",
  phone: "",
  address: ""
};

export const OFFICIAL_SOCIAL_LINKS: SocialLinks = {
  facebook: "",
  instagram: "",
  linkedin: "",
  twitter: "",
  other: ""
};
