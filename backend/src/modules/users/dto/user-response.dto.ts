import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../common/enums/role.enum';
import { AccountStatus } from '../../../common/enums/account-status.enum';

export class UserResponseDto {
  @ApiProperty({ example: 'uuid' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: 'John' })
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  lastName: string;

  @ApiProperty({ enum: Role })
  role: Role;

  @ApiProperty({ enum: AccountStatus })
  accountStatus: AccountStatus;

  @ApiProperty()
  lastLoginAt: Date;

  @ApiProperty()
  createdAt: Date;
}
