import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
//   canActivate(context: ExecutionContext) {
//     // You can add custom logging here
//     const req = context.switchToHttp().getRequest();
//     const authHeader = req.headers['authorization'];
//     console.log('🔐 Auth Header:', authHeader);

//     return super.canActivate(context);
//   }

//   handleRequest(err, user, info, context) {
//     if (err || !user) {
//       console.log('❌ Auth error or no user:', err, info);
//     } else {
//       console.log('✅ Authenticated user:', user);
//     }

//     return user;
//   }
}