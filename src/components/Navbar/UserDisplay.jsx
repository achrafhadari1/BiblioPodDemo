import React from "react";
import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  User,
} from "@nextui-org/react";
import { useNavigate, Link } from "react-router-dom";

export const UserDisplay = ({ userName, userEmail }) => {
  const username = userEmail.split("@")[0];
  const navigate = useNavigate();
  const handleLogout = () => {
    // Remove the token from localStorage
    localStorage.removeItem("token");
    // Redirect to the logout page or any other page after logout
    window.location.href = "/login";
  };
  return (
    <Dropdown placement="bottom-start">
      <DropdownTrigger>
        <User
          as="button"
          avatarProps={{
            isBordered: true,
            src: "https://t4.ftcdn.net/jpg/02/15/84/43/360_F_215844325_ttX9YiIIyeaR7Ne6EaLLjMAmy4GvPC69.jpg",
          }}
          className="transition-transform"
          description={`@${username}`}
          name={userName}
        />
      </DropdownTrigger>
      <DropdownMenu aria-label="User Actions" variant="flat">
        <DropdownItem key="profile" className=" gap-2">
          <p className="font-bold">Signed in as</p>
          <p className="font-bold">{`@${username}`}</p>
        </DropdownItem>

        <DropdownItem key="logout" onClick={handleLogout} color="danger">
          Log Out
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
};
