import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      audience: 'https://hoodgoods-api.com',
      issuer: 'https://dev-vp08yyf1exxzeenl.us.auth0.com/',
      algorithms: ['RS256'],
      secretOrKeyProvider: jwksRsa.passportJwtSecret({
        cache: true,
        rateLimit: true,
        jwksRequestsPerMinute: 5,
        jwksUri: 'https://dev-vp08yyf1exxzeenl.us.auth0.com/.well-known/jwks.json',
      }),
    });
  }

  async validate(payload: any) {
    console.log(payload);
    return payload;
  }
}
