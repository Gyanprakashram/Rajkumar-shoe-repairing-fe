import { useState } from 'react';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';

export default function Login({ onSubmit }) {
  const [form, setForm] = useState({ identifier: '', password: '' });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  return (
    <form className="rk-auth-form" onSubmit={(event) => onSubmit(event, form)}>
      <Input label="Phone or email" name="identifier" value={form.identifier} onChange={handleChange} placeholder="Enter phone or email" />
      <Input label="Password" type="password" name="password" value={form.password} onChange={handleChange} placeholder="Password" />
      <Button type="submit">Login</Button>
    </form>
  );
}
