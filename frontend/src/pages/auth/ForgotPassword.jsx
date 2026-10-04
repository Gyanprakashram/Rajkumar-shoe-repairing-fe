import { useState } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function ForgotPassword({ onSubmit }) {
  const [form, setForm] = useState({ identifier: '', otp: '', password: '' });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  return (
    <form className="rk-auth-form" onSubmit={(event) => onSubmit(event, form)}>
      <Input label="Phone or email" name="identifier" value={form.identifier} onChange={handleChange} placeholder="Enter registered phone or email" />
      <Input label="OTP" name="otp" value={form.otp} onChange={handleChange} placeholder="Enter OTP" />
      <Input label="New password" type="password" name="password" value={form.password} onChange={handleChange} placeholder="New password" />
      <Button type="submit">Reset password</Button>
    </form>
  );
}
