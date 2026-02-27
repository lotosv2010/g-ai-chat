import type { User } from '../schemas/zod';

interface UserInfoCardProps {
  user: User;
}

export const UserInfoCard: React.FC<UserInfoCardProps> = ({ user }) => {
  return (
    <div className="user-card">
      <h3>
        <span>👤</span> 提取的用户信息
      </h3>
      <div className="user-info">
        <p><strong>姓名:</strong> {user.name}</p>
        <p><strong>年龄:</strong> {user.age}</p>
        <p><strong>邮箱:</strong> {user.email}</p>
        <p><strong>手机:</strong> {user.phone}</p>
        <p>
          <strong>地址:</strong> {user.address.city} {user.address.district} {user.address.street}
        </p>
        {user.occupation && <p><strong>职业:</strong> {user.occupation}</p>}
        <p><strong>爱好:</strong> {user.hobbies.join(', ')}</p>
      </div>
    </div>
  );
};
