import Link from "next/link";
import React from "react";

interface FooterLinkProps {
  text: string;
  href: string;
  linkText: string;
}

const FooterLink = ({ text, href, linkText }: FooterLinkProps) => {
  return (
    <div className="text-center pt-4">
      <p className="text-sm text-gray-500">
        {text}{" "}
        <Link href={href} className="footer-link text-blue-600 hover:underline">
          {linkText}
        </Link>
      </p>
    </div>
  );
};

export default FooterLink;
