import React, { useState, useEffect } from "react";
import Logo from "../../images/logo/logo.svg";
import LogoDark from "../../images/logo/logo-dark.svg";
import cover from "../../images/logo/reset.svg";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { CheckMail, ResetAction } from "../../redux/actions/auth";
import { useDispatch, useSelector } from "react-redux";
import InputGroup from "../../components/form/InputGroup";

const Reset = () => {
  const [form, setForm] = useState({});
  const [captchaText, setCaptchaText] = useState("");
  const [userInput, setUserInput] = useState("");
  const [captchaError, setCaptchaError] = useState("");
  const [audioCaptchaText, setAudioCaptchaText] = useState("");
  const [isAudioPlayed, setIsAudioPlayed] = useState(false);
  
  const dispatch = useDispatch();
  const { content } = useSelector((state) => state.errors);
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const email = searchParams.get("email");
  const token = searchParams.get("_token");

  // Generate both text and audio CAPTCHA
  const generateCaptcha = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    setCaptchaText(result);
    setIsAudioPlayed(false); // Reset audio mode

    const pmEnglishWords = [
      "project", "team", "task", "planning", "deadline",
      "resource", "management", "budget", "risk", "tracking"
    ];
    const selectedWords = [];
    const shuffledWords = pmEnglishWords.sort(() => Math.random() - 0.5);
    for (let i = 0; i < 3; i++) {
      selectedWords.push(shuffledWords[i]);
    }
    setAudioCaptchaText(selectedWords.join(" "));
  };

  // Play audio CAPTCHA
  const playAudioCaptcha = () => {
    const utterance = new SpeechSynthesisUtterance(audioCaptchaText);
    utterance.lang = 'en-US'; // Changed to English
    window.speechSynthesis.speak(utterance);
    setIsAudioPlayed(true);
  };

  // Generate captchas on component mount
  useEffect(() => {
    generateCaptcha();
  }, []);

  const OnChangeHandler = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const onSubmitHandler = (e) => {
    e.preventDefault();
    
    // Verify CAPTCHA (either text or audio based on user interaction)
    const isTextMatch = userInput === captchaText;
    const isAudioMatch = isAudioPlayed && userInput.toLowerCase() === audioCaptchaText.toLowerCase();
    
    if (!isTextMatch && !isAudioMatch) {
      setCaptchaError("CAPTCHA verification failed. Please try again.");
      generateCaptcha();
      setUserInput("");
      setIsAudioPlayed(false);
      return;
    }
    
    dispatch(ResetAction(form, email, token));
  };
  
  return (
    <>
      <div className="h-screen rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className=" flex h-screen flex-wrap items-center">
          <div className="hidden h-screen w-full xl:block xl:w-1/2">
            <div className="h-screen px-26 py-17.5 text-center">
              <Link className="mb-5.5 inline-block">
                <img className="hidden dark:block" src={Logo} alt="Logo" />
                <img className="dark:hidden" src={LogoDark} alt="Logo" />
              </Link>

              <p className="2xl:px-20">Esprit created by Apollo Team's Task Manger App</p>

              <img src={cover} alt="Cover" />
            </div>
          </div>

          <div className="w-full border-stroke dark:border-strokedark xl:w-1/2 xl:border-l-2">
            <div className="w-full p-4 sm:p-12.5 xl:p-17.5">
              <h2 className="mb-9 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
                Reset Account Password
              </h2>
              <form onSubmit={onSubmitHandler}>
                <div className="mt-5 text-left">
                  <p>Change your password here</p>
                  <br></br>
                </div>
                <InputGroup
                  label="Password"
                  type="password"
                  name="password"
                  placeholder="Enter your Password"
                  icon={
                    <svg
                      className="fill-current"
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g opacity="0.5">
                        <path
                          d="M16.1547 6.80626V5.91251C16.1547 3.16251 14.0922 0.825009 11.4797 0.618759C10.0359 0.481259 8.59219 0.996884 7.52656 1.95938C6.46094 2.92188 5.84219 4.29688 5.84219 5.70626V6.80626C3.84844 7.18438 2.33594 8.93751 2.33594 11.0688V17.2906C2.33594 19.5594 4.19219 21.3813 6.42656 21.3813H15.5016C17.7703 21.3813 19.6266 19.525 19.6266 17.2563V11C19.6609 8.93751 18.1484 7.21876 16.1547 6.80626ZM8.55781 3.09376C9.31406 2.40626 10.3109 2.06251 11.3422 2.16563C13.1641 2.33751 14.6078 3.98751 14.6078 5.91251V6.70313H7.38906V5.67188C7.38906 4.70938 7.80156 3.78126 8.55781 3.09376ZM18.1141 17.2906C18.1141 18.7 16.9453 19.8688 15.5359 19.8688H6.46094C5.05156 19.8688 3.91719 18.7344 3.91719 17.325V11.0688C3.91719 9.52189 5.15469 8.28438 6.70156 8.28438H15.2953C16.8422 8.28438 18.1141 9.52188 18.1141 11V17.2906Z"
                          fill=""
                        />
                        <path
                          d="M10.9977 11.8594C10.5852 11.8594 10.207 12.2031 10.207 12.65V16.2594C10.207 16.6719 10.5508 17.05 10.9977 17.05C11.4102 17.05 11.7883 16.7063 11.7883 16.2594V12.6156C11.7883 12.2031 11.4102 11.8594 10.9977 11.8594Z"
                          fill=""
                        />
                      </g>
                    </svg>
                  }
                  action={OnChangeHandler}
                  errors={content?.password ?? ""}
                />
                <InputGroup
                  label="Confirm Password"
                  type="password"
                  name="confirm"
                  placeholder="Confirm your password"
                  icon={
                    <svg
                      className="fill-current"
                      width="22"
                      height="22"
                      viewBox="0 0 22 22"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g opacity="0.5">
                        <path
                          d="M16.1547 6.80626V5.91251C16.1547 3.16251 14.0922 0.825009 11.4797 0.618759C10.0359 0.481259 8.59219 0.996884 7.52656 1.95938C6.46094 2.92188 5.84219 4.29688 5.84219 5.70626V6.80626C3.84844 7.18438 2.33594 8.93751 2.33594 11.0688V17.2906C2.33594 19.5594 4.19219 21.3813 6.42656 21.3813H15.5016C17.7703 21.3813 19.6266 19.525 19.6266 17.2563V11C19.6609 8.93751 18.1484 7.21876 16.1547 6.80626ZM8.55781 3.09376C9.31406 2.40626 10.3109 2.06251 11.3422 2.16563C13.1641 2.33751 14.6078 3.98751 14.6078 5.91251V6.70313H7.38906V5.67188C7.38906 4.70938 7.80156 3.78126 8.55781 3.09376ZM18.1141 17.2906C18.1141 18.7 16.9453 19.8688 15.5359 19.8688H6.46094C5.05156 19.8688 3.91719 18.7344 3.91719 17.325V11.0688C3.91719 9.52189 5.15469 8.28438 6.70156 8.28438H15.2953C16.8422 8.28438 18.1141 9.52188 18.1141 11V17.2906Z"
                          fill=""
                        />
                        <path
                          d="M10.9977 11.8594C10.5852 11.8594 10.207 12.2031 10.207 12.65V16.2594C10.207 16.6719 10.5508 17.05 10.9977 17.05C11.4102 17.05 11.7883 16.7063 11.7883 16.2594V12.6156C11.7883 12.2031 11.4102 11.8594 10.9977 11.8594Z"
                          fill=""
                        />
                      </g>
                    </svg>
                  }
                  action={OnChangeHandler}
                  errors={content?.confirm ?? ""}
                />
                
                {/* CAPTCHA Verification Section with Single Input */}
                <div className="mb-4.5">
                  <label className="mb-2.5 block font-medium text-black dark:text-white">
                    CAPTCHA Verification
                  </label>
                  <div className="flex flex-col gap-3">
                    {/* Combined Text and Audio CAPTCHA on a single line */}
                    <div className="bg-gray-200 dark:bg-gray-700 p-3 rounded-lg flex items-center justify-between">
                      <div className="font-bold tracking-wider text-lg select-none" style={{ 
                        color: '#1E40AF',
                        fontFamily: 'monospace',
                        letterSpacing: '0.2em'
                      }}>
                        {captchaText}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={playAudioCaptcha}
                          className="p-2 rounded-md bg-primary text-white hover:bg-opacity-90"
                        >
                          <svg
                            className="w-5 h-5"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path d="M11 5L6 9H2V15H6L11 19V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M15.54 8.46C16.2601 9.18014 16.75 10.1405 16.75 11.125C16.75 12.1095 16.2601 13.0699 15.54 13.79" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18.44 5.66C20.1802 7.40022 21.25 9.75825 21.25 12.125C21.25 14.4917 20.1802 16.8498 18.44 18.59" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={generateCaptcha}
                          className="p-2 rounded-md bg-primary text-white hover:bg-opacity-90"
                        >
                          <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Single Input for Both Text and Audio CAPTCHA */}
                    <div className="relative">
                      <input
                        type="text"
                        name="captcha"
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder="Enter what you see or hear"
                        className="w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary"
                      />
                      <span className="absolute right-4 top-4">
                        <svg
                          className="fill-current"
                          width="22"
                          height="22"
                          viewBox="0 0 22 22"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <g opacity="0.5">
                            <path
                              d="M19.2516 3.30005H2.75156C1.58281 3.30005 0.585938 4.26255 0.585938 5.46567V16.6032C0.585938 17.7719 1.54844 18.7688 2.75156 18.7688H19.2516C20.4203 18.7688 21.4172 17.8063 21.4172 16.6032V5.4313C21.4172 4.26255 20.4203 3.30005 19.2516 3.30005ZM19.2516 4.84692C19.2859 4.84692 19.3203 4.84692 19.3547 4.84692L11.0016 10.2094L2.64844 4.84692C2.68281 4.84692 2.71719 4.84692 2.75156 4.84692H19.2516ZM19.2516 17.1532H2.75156C2.40781 17.1532 2.13281 16.8782 2.13281 16.5344V6.35942L10.1766 11.5157C10.4172 11.6875 10.6922 11.7563 10.9672 11.7563C11.2422 11.7563 11.5172 11.6875 11.7578 11.5157L19.8016 6.35942V16.5688C19.8703 16.9125 19.5953 17.1532 19.2516 17.1532Z"
                              fill=""
                            />
                          </g>
                        </svg>
                      </span>
                    </div>
                    {captchaError && (
                      <div className="text-red-500 text-sm">{captchaError}</div>
                    )}
                  </div>
                </div>

                <div className="mb-5">
                  <input
                    type="submit"
                    value="Change your password"
                    className="w-full cursor-pointer rounded-lg border border-primary bg-primary p-4 text-white transition hover:bg-opacity-90"
                  />
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Reset;