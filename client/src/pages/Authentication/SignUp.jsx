import React, { useState } from 'react';
import Logo from '../../images/logo/logo.svg';
import LogoDark from '../../images/logo/logo-dark.svg';
import regcover from '../../images/logo/regcover.svg';
import { Link } from 'react-router-dom';
import { AddUser } from '../../redux/actions/users';
import { useDispatch } from 'react-redux';
import AuthGithub from '../../components/AuthGithub';
import AuthGoogle from '../../components/AuthGoogle';

const SignUp = () => {
  const dispatch = useDispatch();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    roles: 'ENGINEER',
  });

  const onChangeHandler = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmitHandler = (e) => {
    e.preventDefault();
    console.log(form);
    dispatch(AddUser(form));
  };

  return (
    <>
      <div className='rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark'>
        <div className='flex flex-wrap items-center'>
          <div className='hidden w-full xl:block xl:w-1/2'>
            <div className='py-17.5 px-26 text-center'>
              <Link to='/' className='mb-5.5 inline-block'>
                <img className='hidden dark:block' src={Logo} alt='Logo' />
                <img className='dark:hidden' src={LogoDark} alt='Logo' />
              </Link>
              <p className='2xl:px-20'>Esprit created by Apollo Team's Task Manager App</p>
              <img src={regcover} alt='cover' />
            </div>
          </div>

          <div className='w-full border-stroke dark:border-strokedark xl:w-1/2 xl:border-l-2'>
            <div className='w-full p-4 sm:p-12.5 xl:p-17.5'>
              <h2 className='mb-9 text-2xl font-bold text-black dark:text-white sm:text-title-xl2'>
                Sign Up to TASKIFY
              </h2>

              <form onSubmit={onSubmitHandler}>
                <div className='mb-4'>
                  <label className='mb-2.5 block font-medium text-black dark:text-white'>
                    Name
                  </label>
                  <input
                    type='text'
                    name='fullName'
                    value={form.fullName}
                    onChange={onChangeHandler}
                    placeholder='Enter your full name'
                    className='w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary'
                  />
                </div>

                <div className='mb-4'>
                  <label className='mb-2.5 block font-medium text-black dark:text-white'>
                    Email
                  </label>
                  <input
                    type='email'
                    name='email'
                    value={form.email}
                    onChange={onChangeHandler}
                    placeholder='Enter your email'
                    className='w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary'
                  />
                </div>

                <div className='mb-4'>
                  <label className='mb-2.5 block font-medium text-black dark:text-white'>
                    Password
                  </label>
                  <input
                    type='password'
                    name='password'
                    value={form.password}
                    onChange={onChangeHandler}
                    placeholder='Enter your password'
                    className='w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 outline-none focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:focus:border-primary'
                  />
                </div>

                <div className='mb-5'>
                  <input
                    type='submit'
                    value='Create account'
                    className='w-full cursor-pointer rounded-lg border border-primary bg-primary p-4 text-white transition hover:bg-opacity-90'
                  />
                </div>
                
                    
                <div className='mt-6 text-center'>
                  <p>
                    Already have an account?{' '}
                    <Link to='/auth/signin' className='text-secondary'>
                      Sign in
                    </Link>
                  </p>
                </div>
              </form>
              <AuthGoogle></AuthGoogle>
              <AuthGithub></AuthGithub>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SignUp;