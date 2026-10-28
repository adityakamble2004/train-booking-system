# Railyatra API Reference for ChatGPT

Version: 1.0

> **Accuracy note:** This file is based on routes, controller code,
> examples, and responses shared in conversation. It is not yet a full
> source-code audit. Items marked **VERIFY IN SOURCE** are not
> guaranteed routes. Never invent request fields or claim a ticket is
> booked without a confirmed backend response.

## 1. Local setup

-   Base URL: `http://localhost:8081`
-   Protected endpoints generally use
    `Authorization: Bearer <ACCESS_TOKEN>`.
-   JSON request bodies generally use `Content-Type: application/json`.
-   Use a **normal user token** for delegation management.
-   Use an **agent token** only for actions allowed by its scopes.
-   Do not store real access tokens, refresh tokens, passwords, or
    payment secrets in this file.

**Windows ChatGPT limitation:** This file documents APIs; it does not
itself give ChatGPT network access to `localhost` or control Postman.
Direct execution requires an approved connector/tool or a local HTTP
workflow. Do not expose a development API publicly just to enable
access.

## 2. Confirmed Agent Delegation APIs

Base path: `/api/v1/agent/delegations`

  -------------------------------------------------------------------------------------------------------------------
  Method         Path                                       Parameters     Body                        Auth
  -------------- ------------------------------------------ -------------- --------------------------- --------------
  POST           `/api/v1/agent/delegations`                None           `CreateDelegationRequest`   Normal user
                                                                           JSON                        token

  GET            `/api/v1/agent/delegations`                None           None                        Normal user
                                                                                                       token

  POST           `/api/v1/agent/delegations/{id}/token`     Path `id`      None                        Normal user
                                                            (long)                                     token

  POST           `/api/v1/agent/delegations/{id}/revoke`    Path `id`      None                        Normal user
                                                            (long)                                     token

  GET            `/api/v1/agent/delegations/{id}/actions`   Path `id`;     None                        Normal user
                                                            query `page`                               token
                                                            (default 0),                               
                                                            `size`                                     
                                                            (default 20)                               
  -------------------------------------------------------------------------------------------------------------------

Examples using delegation ID `1`: -
`GET http://localhost:8081/api/v1/agent/delegations` -
`POST http://localhost:8081/api/v1/agent/delegations/1/token` -
`GET http://localhost:8081/api/v1/agent/delegations/1/actions?page=0&size=20` -
`POST http://localhost:8081/api/v1/agent/delegations/1/revoke`

**Revoke last:** revocation can disable the delegation and prevent
further agent-token use.

### Create delegation body (previously successful)

`POST http://localhost:8081/api/v1/agent/delegations`

``` json
{
  "name": "My assistant",
  "scopes": ["search", "read_profile", "read_passengers", "book", "read_bookings"],
  "maxFarePerBookingPaise": 50000,
  "maxSpend24hPaise": 100000,
  "maxPassengers": 2,
  "allowedClasses": ["SL"],
  "savedPassengersOnly": true,
  "validDays": 7
}
```

Notes: ₹500 per-booking cap; ₹1,000 24-hour spend cap; Sleeper (`SL`)
only; max 2 passengers; saved passengers only; validity 7 days in this
example. Check the DTO for exact validation constraints.

### Observed delegation response fields

`id`, `name`, `status`, `usable`, `scopes`, `maxFarePerBookingPaise`,
`maxSpend24hPaise`, `maxPassengers`, `allowedClasses`,
`savedPassengersOnly`, `expiresAt`, `createdAt`, `revokedAt`.

### Observed token response shape

``` json
{
  "accessToken": "<issued-token>",
  "tokenType": "Bearer",
  "expiresIn": 900,
  "delegationId": 1,
  "scopes": ["search", "read_profile", "read_passengers", "book", "read_bookings"]
}
```

Never put a real token into this file.

### Observed action-history response shape

``` json
{
  "content": [
    {
      "id": 1,
      "actor": "API",
      "method": "GET",
      "path": "/api/v1/users/me",
      "query": null,
      "statusCode": 200,
      "summary": null,
      "createdAt": "2026-10-28T18:23:15Z"
    }
  ],
  "page": 0,
  "size": 20,
  "totalElements": 1
}
```

## 3. User and passenger APIs

  -------------------------------------------------------------------------------------
  Method            Path                            Parameters/body   Status
  ----------------- ------------------------------- ----------------- -----------------
  GET               `/api/v1/users/me`              None              Successfully
                                                                      tested with user
                                                                      token and
                                                                      previously tested
                                                                      agent token

  GET               `/api/v1/users/me/passengers`   None              Discussed;
                                                                      test/verify
                                                                      current mapping
                                                                      and response
                                                                      fields
  -------------------------------------------------------------------------------------

Observed `/api/v1/users/me` response:

``` json
{
  "id": 1,
  "email": "aditya@example.com",
  "fullName": "Aditya Kamble",
  "role": "USER"
}
```

Do not assume passenger response fields until inspected from the live
response or DTO.

## 4. Station and train APIs

These were previously identified from backend testing; confirm the
current controller before treating every route as guaranteed.

  -------------------------------------------------------------------------------------------
  Method            Path                                  Parameters        Status
  ----------------- ------------------------------------- ----------------- -----------------
  GET               `/api/v1/stations/suggest`            Query `q`; at     Previously tested
                                                          least 2           
                                                          characters were   
                                                          required          

  GET               `/api/v1/trains/search`               Query `from`,     Previously
                                                          `to`              identified

  GET               `/api/v1/trains/{trainNo}/schedule`   Path `trainNo`    Previously
                                                                            identified

  GET               `/api/trains`                         Exact query       Verify in source
                                                          parameters        
                                                          unknown           

  GET               `/api/trains/by-number`               Exact parameter   Verify in source;
                                                          name unknown      previous attempt
                                                                            returned "No
                                                                            static resource"
                                                                            on port 8080
  -------------------------------------------------------------------------------------------

Examples: - `GET http://localhost:8081/api/v1/stations/suggest?q=pu` -
`GET http://localhost:8081/api/v1/trains/search?from=PUNE&to=CSMT` -
`GET http://localhost:8081/api/v1/trains/01488/schedule`

Use station codes that actually exist in the database. Do not claim
fares or availability unless returned by the backend.

## 5. Journey administration

  --------------------------------------------------------------------------------
  Method            Path                       Parameters/body   Status
  ----------------- -------------------------- ----------------- -----------------
  POST              `/api/v1/admin/journeys`   Previously used   Verify current
                                               JSON below        mapping and
                                                                 required role

  --------------------------------------------------------------------------------

Previously used example (historical dates; replace with valid future
dates):

``` json
{
  "trainNo": "01488",
  "fromDate": "2026-10-28",
  "toDate": "2026-10-30",
  "classes": {
    "SL": 3,
    "3A": 1
  }
}
```

Exact DTO and authorization rules must be checked against the current
code.

## 6. Booking and payment APIs

The payment flow below was discussed earlier. The booking-create
endpoint and exact request DTO were not confirmed in the material
available.

  ---------------------------------------------------------------------------------------------------
  Method            Path                                        Parameters/body     Status
  ----------------- ------------------------------------------- ------------------- -----------------
  POST              `/api/v1/bookings`                          Booking JSON        **VERIFY IN
                                                                unknown             SOURCE**

  GET               `/api/v1/bookings/{pnr}`                    Path `pnr`          **VERIFY IN
                                                                                    SOURCE**

  POST              `/api/v1/bookings/{pnr}/payments`           Path `pnr`; check   Payment-order
                                                                whether             flow discussed
                                                                `Idempotency-Key`   
                                                                header is required  

  POST              `/api/v1/dev/payments/{orderId}/complete`   Path `orderId`;     Mock-payment flow
                                                                body below          discussed

  POST              `/api/v1/payments/webhook`                  Provider-specific   **VERIFY IN
                                                                headers and payload SOURCE**

  GET               `/api/v1/pnr/...`                           Exact route unknown **VERIFY IN
                                                                                    SOURCE**
  ---------------------------------------------------------------------------------------------------

Mock payment completion body:

``` json
{"outcome": "SUCCESS"}
```

or

``` json
{"outcome": "FAILURE"}
```

Earlier described development behavior: success may confirm the booking;
failure may leave it `PENDING_PAYMENT`. Payment-order response
previously included `orderId`, `amountPaise`, and `holdSecondsLeft`.
Verify exact schemas/state transitions in the current implementation.
Never call dev payment completion in production.

**Do not invent a booking JSON body.** Inspect the booking controller
and DTO first. Before a real booking or payment, show the user train,
date, class, passengers, fare and obtain explicit approval.

## 7. Authentication, health, and admin routes

These are candidates only, not confirmed mappings:

  Method    Candidate path            Status
  --------- ------------------------- ----------------------------------------
  POST      `/api/v1/auth/register`   Verify in source
  POST      `/api/v1/auth/login`      Verify in source
  POST      `/api/v1/auth/refresh`    Verify in source
  POST      `/api/v1/auth/logout`     Verify in source
  GET       `/actuator/health`        Verify Actuator exposure/configuration
  Various   `/api/v1/admin/**`        Enumerate actual admin controllers

## 8. Request construction

Protected request header:

``` http
Authorization: Bearer <ACCESS_TOKEN>
```

JSON request header:

``` http
Content-Type: application/json
```

-   **Path parameter**: part of URL, e.g. `{id}`, `{pnr}`, `{trainNo}`,
    `{orderId}`.
-   **Query parameter**: after `?`, e.g. `?page=0&size=20`.
-   **JSON body**: data sent with POST/PUT/PATCH.
-   **Header**: authorization, content type, idempotency key, or
    provider-specific values.

## 9. Suggested command workflow for ChatGPT

For "Search trains from Pune to Mumbai tomorrow":

1.  Determine the intended journey date and local timezone.
2.  Resolve exact station codes using station suggestions when needed.
3.  Search trains with the confirmed route and valid station codes.
4.  Fetch schedule/details if the API supports it.
5.  Show only returned details (train, times, class, fare,
    availability).
6.  Ask the user to choose train, date, class and passengers.
7.  Validate delegation scopes/limits if an agent token is used.
8.  Construct booking JSON from the actual DTO; never guess field names.
9.  Before final booking/payment, show the full summary and get explicit
    approval.
10. Confirm success only from the actual backend response and return the
    PNR/booking details.

Example commands: - "List my active agent delegations." - "Show action
history for delegation 1, page 0, size 20." - "Search trains from PUNE
to CSMT on \[date\]." - "Show my saved passengers." - "Prepare a booking
for train \[number\], date \[date\], class \[class\], passengers
\[selection\]. Do not submit until I approve." - "Check booking status
for PNR \[PNR\]." - "Revoke delegation \[id\] only after asking me to
confirm."

## 10. Safety and troubleshooting rules

-   Never guess routes, DTO fields, station codes, fares, availability
    or booking status.
-   For `404`, check the route; for `405`, check the HTTP method and
    duplicate/stale mappings; for `401/403`, check token, role, scopes
    and expiry.
-   Use a normal user token for delegation management; use an agent
    token for delegated operations.
-   Do not include secrets in this reference file.
-   Test revoke last.
-   This file documents APIs; it does not itself provide network access
    or execute HTTP requests.

## 11. Source files needed to complete verification

Inspect: - Every `@RestController` and class-level `@RequestMapping` -
Every `@GetMapping`, `@PostMapping`, `@PutMapping`, `@PatchMapping`,
`@DeleteMapping` - Request/response DTOs and validation annotations -
Spring Security configuration, roles and delegation scopes -
Booking/payment services and integration tests - Application
port/context-path configuration

Until that review is done, routes marked **VERIFY IN SOURCE** are not
guaranteed to exist.
