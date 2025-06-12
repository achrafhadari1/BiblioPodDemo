import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="z-10  shadow mt-auto ml-auto mr-auto w-4/5 py-4">
      <div className="okeymobile w-full mx-auto max-w-screen-xl px-4 md:flex md:items-center md:justify-between">
        <span className="reserved-text text-sm text-gray-500  sm:text-center">
          © 2025{" "}
          <Link to="/" className="hover:underline">
            BiblioPod
          </Link>
          . All Rights Reserved.
        </span>
        <ul className="ul-footer flex flex-wrap items-center mt-3 text-sm font-medium text-gray-500 sm:mt-0">
          <li>
            <Link to="#" className="hover:underline me-4 md:me-6">
              About
            </Link>
          </li>
          <li>
            <Link to="#" className="hover:underline me-4 md:me-6">
              Privacy Policy
            </Link>
          </li>
          <li>
            <Link to="#" className="hover:underline me-4 md:me-6">
              Licensing
            </Link>
          </li>
          <li>
            <Link to="#" className="hover:underline">
              Contact
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
};

export default Footer;
