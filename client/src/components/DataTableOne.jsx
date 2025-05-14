import React, { useEffect, useRef } from "react";
import { DataTable } from "simple-datatables";
import { useDispatch } from "react-redux";
import axios from "axios";
import { FindUsers } from "../redux/actions/users";
import { _FindOneUser } from "../redux/reducers/users";
import { toggleModal } from "../redux/reducers/commons";
import swal from "sweetalert";
import QRCode from "react-qr-code";

const DataTableOne = ({ data, popupOpen, setPopupOpen }) => {
  const dispatch = useDispatch();
  const dataTableRef = useRef(null);

  // Debugging: Log the data to ensure userData._id exists
  useEffect(() => {
    console.log("[DataTableOne] Received data:", data);
    if (Array.isArray(data)) {
      data.forEach((user, index) => {
        console.log(`[DataTableOne] User ${index}:`, user);
        console.log(`[DataTableOne] User ${index} _id:`, user._id);
      });
    }
  }, [data]);

  // Attach direct event handlers to buttons
  const attachDirectEventHandlers = () => {
    console.log("[DataTable] Attaching direct event handlers to buttons");

    const deleteButtons = document.querySelectorAll("[data-action='delete']");
    deleteButtons.forEach(button => {
      const userId = button.getAttribute("data-user-id");
      console.log("[DataTable] Found delete button for user ID:", userId);
      button.removeEventListener("click", handleDelete);
      button.addEventListener("click", handleDelete);
    });

    const editButtons = document.querySelectorAll("[data-action='edit']");
    editButtons.forEach(button => {
      const userId = button.getAttribute("data-user-id");
      console.log("[DataTable] Found edit button for user ID:", userId);
      button.removeEventListener("click", handleEdit);
      button.addEventListener("click", handleEdit);
    });
  };

  // Handle delete action
  const handleDelete = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const userId = e.currentTarget.getAttribute("data-user-id");
    console.log("[DataTable] Delete button clicked for user ID:", userId);

    if (!userId) {
      console.error("[DataTable] Cannot delete - missing user ID");
      return;
    }

    if (window.confirm("Do you want to delete this user?")) {
      console.log("[DataTable] Delete confirmed for ID:", userId);
      dispatch({ type: "SET_REFRESH", payload: true });

      const token = localStorage.getItem("token");
      axios
        .delete(`/api/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then(response => {
          console.log("[DataTable] Delete success:", response.data);
          swal("Success", "User deleted successfully", "success");
          dispatch(FindUsers());
        })
        .catch(error => {
          console.error("[DataTable] Delete error:", error.response?.data || error.message);
          swal("Error", "Failed to delete user", "error");
        })
        .finally(() => {
          dispatch({ type: "SET_REFRESH", payload: false });
        });
    }
  };

  // Handle edit action
  const handleEdit = (e) => {
    e.preventDefault();
    e.stopPropagation();

    const userId = e.currentTarget.getAttribute("data-user-id");
    console.log("[DataTable] Edit button clicked for user ID:", userId);

    if (!userId) {
      console.error("[DataTable] Cannot edit - missing user ID");
      return;
    }

    dispatch({ type: "SET_REFRESH", payload: true });

    const token = localStorage.getItem("token");
    axios
      .get(`/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(response => {
        console.log("[DataTable] Fetched user data for editing:", response.data);
        dispatch(_FindOneUser(response.data));
        dispatch(toggleModal(true));
        if (typeof setPopupOpen === "function") {
          setPopupOpen(true);
        }
      })
      .catch(error => {
        console.error("[DataTable] Edit error:", error.response?.data || error.message);
        swal("Error", "Failed to fetch user data for editing", "error");
      })
      .finally(() => {
        dispatch({ type: "SET_REFRESH", payload: false });
      });
  };

  // Re-attach event handlers when data changes
  useEffect(() => {
    console.log("[DataTable] Data changed, will attach handlers after table initialization");
  }, [data]);

  // Initialize DataTable
  useEffect(() => {
    if (dataTableRef.current) {
      try {
        dataTableRef.current.destroy();
      } catch (error) {
        console.error("Error destroying DataTable:", error);
      }
      dataTableRef.current = null;
    }

    if (Array.isArray(data) && data.length > 0) {
      const tableElement = document.getElementById("dataTableOne");
      if (tableElement) {
        try {
          console.log("[DataTable] Initializing with data:", data);
          dataTableRef.current = new DataTable("#dataTableOne", {
            perPageSelect: [5, 10, 15, ["All", -1]],
            columns: [
              { select: 2, sortSequence: ["desc", "asc"] },
              { select: 3, sortSequence: ["desc"] },
              { select: 4, cellClass: "green", headerClass: "red" },
            ],
            tableRender: (_data, table, type) => {
              if (type === "print") return table;
              const tHead = table.childNodes[0];
              const filterHeaders = {
                nodeName: "TR",
                childNodes: tHead.childNodes[0].childNodes.map((_th, index) => ({
                  nodeName: "TH",
                  childNodes: [
                    {
                      nodeName: "INPUT",
                      attributes: {
                        class: "datatable-input",
                        type: "search",
                        "data-columns": `[${index}]`,
                      },
                    },
                  ],
                })),
              };
              tHead.childNodes.push(filterHeaders);
              return table;
            },
          });

          setTimeout(attachDirectEventHandlers, 100);
        } catch (error) {
          console.error("Error initializing DataTable:", error);
        }
      }
    }

    return () => {
      if (dataTableRef.current) {
        try {
          dataTableRef.current.destroy();
        } catch (error) {
          console.error("Error cleaning up DataTable:", error);
        }
      }
    };
  }, [data]);

  // Function to format user details for display
  const formatUserDetails = (userData) => {
    return `
FullName: ${userData.fullName || "N/A"}
Email: ${userData.email || "N/A"}
Phone: ${userData.phone || "N/A"}
Roles: ${userData.roles?.length ? userData.roles.join(", ") : "None"}
Status: ${userData.status || "Active"}
    `.trim();
  };

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="data-table-common data-table-one max-w-full overflow-x-auto">
        <table className="table w-full table-auto" id="dataTableOne">
          <thead>
            <tr>
              <th>
                <div className="flex items-center gap-1.5">
                  <p>FullName</p>
                  <div className="inline-flex flex-col space-y-[2px]">
                    <span className="inline-block">
                      <svg className="fill-current" width="10" height="5" viewBox="0 0 10 5">
                        <path d="M5 0L0 5H10L5 0Z" fill="" />
                      </svg>
                    </span>
                    <span className="inline-block">
                      <svg className="fill-current" width="10" height="5" viewBox="0 0 10 5">
                        <path d="M5 5L10 0L-4.37114e-07 8.74228e-07L5 5Z" fill="" />
                      </svg>
                    </span>
                  </div>
                </div>
              </th>
              <th>
                <div className="flex items-center gap-1.5">
                  <p>Email</p>
                  <div className="inline-flex flex-col space-y-[2px]">
                    <span className="inline-block">
                      <svg className="fill-current" width="10" height="5" viewBox="0 0 10 5">
                        <path d="M5 0L0 5H10L5 0Z" fill="" />
                      </svg>
                    </span>
                    <span className="inline-block">
                      <svg className="fill-current" width="10" height="5" viewBox="0 0 10 5">
                        <path d="M5 5L10 0L-4.37114e-07 8.74228e-07L5 5Z" fill="" />
                      </svg>
                    </span>
                  </div>
                </div>
              </th>
              <th>
                <div className="flex items-center gap-1.5">
                  <p>Phone</p>
                  <div className="inline-flex flex-col space-y-[2px]">
                    <span className="inline-block">
                      <svg className="fill-current" width="10" height="5" viewBox="0 0 10 5">
                        <path d="M5 0L0 5H10L5 0Z" fill="" />
                      </svg>
                    </span>
                    <span className="inline-block">
                      <svg className="fill-current" width="10" height="5" viewBox="0 0 10 5">
                        <path d="M5 5L10 0L-4.37114e-07 8.74228e-07L5 5Z" fill="" />
                      </svg>
                    </span>
                  </div>
                </div>
              </th>
              <th>
                <div className="flex items-center gap-1.5">
                  <p>Roles</p>
                  <div className="inline-flex flex-col space-y-[2px]">
                    <span className="inline-block">
                      <svg className="fill-current" width="10" height="5" viewBox="0 0 10 5">
                        <path d="M5 0L0 5H10L5 0Z" fill="" />
                      </svg>
                    </span>
                    <span className="inline-block">
                      <svg className="fill-current" width="10" height="5" viewBox="0 0 10 5">
                        <path d="M5 5L10 0L-4.37114e-07 8.74228e-07L5 5Z" fill="" />
                      </svg>
                    </span>
                  </div>
                </div>
              </th>
              <th>
                <div className="flex items-center gap-1.5">
                  <p>Status</p>
                  <div className="inline-flex flex-col space-y-[2px]">
                    <span className="inline-block">
                      <svg className="fill-current" width="10" height="5" viewBox="0 0 10 5">
                        <path d="M5 0L0 5H10L5 0Z" fill="" />
                      </svg>
                    </span>
                    <span className="inline-block">
                      <svg className="fill-current" width="10" height="5" viewBox="0 0 10 5">
                        <path d="M5 5L10 0L-4.37114e-07 8.74228e-07L5 5Z" fill="" />
                      </svg>
                    </span>
                  </div>
                </div>
              </th>
              <th>
                <div className="flex items-center gap-1.5">
                  <p>Actions</p>
                </div>
              </th>
              <th>
                <div className="flex items-center gap-1.5">
                  <p>QrCode</p>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(data) &&
              data.map((userData, index) => {
                // Fallback ID if _id is missing
                const userId = userData._id || `fallback-id-${index}`;
                console.log("[DataTableOne] Using userId:", userId);

                // Prepare the data to encode in the QR code
                const qrData = JSON.stringify({
                  fullName: userData.fullName || "N/A",
                  email: userData.email || "N/A",
                  phone: userData.phone || "N/A",
                  roles: userData.roles?.length ? userData.roles : ["None"],
                  status: userData.status || "Active",
                });

                return (
                  <tr key={userData._id || index}>
                    <td>
                      <div className="w-2/12 xl:w-3/12">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-between gap-x-2 2xsm:h-11 2xsm:w-full 2xsm:max-w-11 2xsm:rounded-full">
                            {userData.picture && (
                              <img
                                src={`${
                                  userData.picture.includes("https")
                                    ? userData.picture
                                    : `http://localhost:5502${userData.picture}`
                                }`}
                                className="h-[30px] w-auto rounded-full"
                                alt={userData.fullName || "User"}
                                onError={(e) => {
                                  e.target.onerror = null;
                                  e.target.src = "https://via.placeholder.com/30";
                                }}
                              />
                            )}
                            <span className="hidden font-medium xl:block">
                              {userData?.fullName}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="w-2/12 xl:w-3/12">
                        <div className="flex items-center gap-4">
                          <span className="hidden font-medium xl:block">
                            {userData?.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="w-2/12 xl:w-3/12">
                        <div className="flex w-[200px] items-center gap-4">
                          <span className="hidden font-medium xl:block">
                            {userData?.phone ?? ""}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="w-1/12 xl:w-2/12">
                        <div className="flex items-center gap-4">
                          {userData?.roles
                            ? userData.roles.map((role, roleIndex) => (
                                <span
                                  key={roleIndex}
                                  className="font-sm inline-block rounded bg-meta-3/[0.08] px-2.5 py-0.5 text-sm text-meta-8 odd:text-meta-10"
                                >
                                  {role}
                                </span>
                              ))
                            : ""}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="w-2/12 xl:w-3/12">
                        <div className="flex items-center gap-4">
                          <span className="inline-block rounded bg-meta-3/[0.08] px-2.5 py-0.5 text-sm font-medium text-meta-3">
                            {userData.status || "Active"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="flex gap-x-3 gap-y-3">
                      {/* Delete Button */}
                      <button
                        className="mx-auto block hover:text-meta-1"
                        type="button"
                        data-action="delete"
                        data-user-id={userData?._id || ""}
                      >
                        <svg
                          className="mx-auto fill-current"
                          width="22"
                          height="22"
                          viewBox="0 0 22 22"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            d="M16.8094 3.02498H14.1625V2.4406C14.1625 1.40935 13.3375 0.584351 12.3062 0.584351H9.65935C8.6281 0.584351 7.8031 1.40935 7.8031 2.4406V3.02498H5.15623C4.15935 3.02498 3.33435 3.84998 3.33435 4.84685V5.8781C3.33435 6.63435 3.78123 7.2531 4.43435 7.5281L4.98435 18.9062C5.0531 20.3156 6.22185 21.4156 7.63123 21.4156H14.3C15.7093 21.4156 16.8781 20.3156 16.9469 18.9062L17.5312 7.49372C18.1844 7.21872 18.6312 6.5656 18.6312 5.84373V4.81248C18.6312 3.84998 17.8062 3.02498 16.8094 3.02498ZM9.38435 2.4406C9.38435 2.26873 9.52185 2.13123 9.69373 2.13123H12.3406C12.5125 2.13123 12.65 2.26873 12.65 2.4406V3.02498H9.41873V2.4406H9.38435ZM4.9156 4.84685C4.9156 4.70935 5.01873 4.57185 5.1906 4.57185H16.8094C16.9469 4.57185 17.0844 4.67498 17.0844 4.84685V5.8781C17.0844 6.0156 16.9812 6.1531 16.8094 6.1531H5.1906C5.0531 6.1531 4.9156 6.04998 4.9156 5.8781V4.84685V4.84685ZM14.3344 19.8687H7.6656C7.08123 19.8687 6.59998 19.4218 6.5656 18.8031L6.04998 7.6656H15.9844L15.4687 18.8031C15.4 19.3875 14.9187 19.8687 14.3344 19.8687Z"
                            fill=""
                          />
                          <path
                            d="M11 11.1375C10.5875 11.1375 10.2094 11.4812 10.2094 11.9281V16.2937C10.2094 16.7062 10.5531 17.0843 11 17.0843C11.4125 17.0843 11.7906 16.7406 11.7906 16.2937V11.9281C11.7906 11.4812 11.4125 11.1375 11 11.1375Z"
                            fill=""
                          />
                          <path
                            d="M13.7499 11.825C13.303 11.7906 12.9593 12.1 12.9249 12.5469L12.7187 15.5719C12.6843 15.9844 12.9937 16.3625 13.4405 16.3969C13.4749 16.3969 13.4749 16.3969 13.5093 16.3969C13.9218 16.3969 14.2655 16.0875 14.2655 15.675L14.4718 12.65C14.4718 12.2031 14.1624 11.8594 13.7499 11.825Z"
                            fill=""
                          />
                          <path
                            d="M8.21558 11.825C7.80308 11.8594 7.45933 12.2375 7.49371 12.65L7.73433 15.675C7.76871 16.0875 8.11246 16.3969 8.49058 16.3969C8.52496 16.3969 8.52496 16.3969 8.55933 16.3969C8.97183 16.3625 9.31558 15.9844 9.28121 15.5719L9.04058 12.5469C9.04058 12.1 8.66246 11.7906 8.21558 11.825Z"
                            fill=""
                          />
                        </svg>
                      </button>

                      {/* Edit Button */}
                      <button
                        className="mx-auto block hover:text-primary"
                        type="button"
                        data-action="edit"
                        data-user-id={userData?._id || ""}
                      >
                        <svg
                          className="mx-auto fill-current text-gray-3 hover:text-meta-3"
                          width="22"
                          height="22"
                          viewBox="0 0 22 22"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <title>Edit User</title>
                          <g stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
                            <g
                              transform="translate(-140.000000, -2319.000000)"
                              fill="gray"
                              className="current-fill hover:text-meta-3"
                            >
                              <g transform="translate(56.000000, 160.000000)">
                                <path
                                  d="M86.4570767,2175.58276 L99.6296259,2161.94876 L101.053522,2163.42214 L87.8809728,2177.05714 L86.4570767,2175.58276 Z M99.8259906,2159 L84,2175.58276 L84,2179 L87.8809728,2179 L104,2162.91969 L99.8259906,2159 Z"
                                  id="pen-[#1320]"
                                ></path>
                              </g>
                            </g>
                          </g>
                        </svg>
                      </button>
                    </td>
                    <td>
                      <div className="w-[120px] xl:w-[150px] flex justify-center">
                        <div className="flex flex-col items-center gap-2">
                          {/* QR Code with user details */}
                          <QRCode
                            value={qrData}
                            size={100}
                            level="H"
                            style={{
                              display: "block",
                              visibility: "visible",
                              border: "1px solid #d1d5db",
                              borderRadius: "4px",
                              padding: "4px",
                              background: "white",
                            }}
                          />
                          {/* SCAN ME Button */}
                          <button
                            className="flex items-center gap-1 bg-black text-white text-xs font-semibold px-3 py-1 rounded-full"
                            onClick={() => alert(formatUserDetails(userData))}
                          >
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                              xmlns="http://www.w3.org/2000/svg"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 1v2m0 18v2M1 12h2m18 0h2M4.22 4.22l1.42 1.42m12.16 12.16l1.42 1.42M4.22 19.78l1.42-1.42m12.16-12.16l1.42-1.42"
                              />
                            </svg>
                            SCAN ME
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTableOne;