-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('tenant', 'provider', 'driver', 'merchant');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('plumbing', 'electrical', 'cleaning', 'carpentry', 'appliances');

-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('supermarket', 'pharmacy');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('service', 'store_delivery', 'ride_cargo');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'assigned', 'en_route', 'arrived', 'in_progress', 'completed', 'cancelled');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'tenant',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerifiedPro" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "category" "ServiceCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "reviewCount" INTEGER NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "isVerified" BOOLEAN NOT NULL,
    "licenseNumber" TEXT,
    "yearsExperience" INTEGER NOT NULL,
    "distanceMiles" DOUBLE PRECISION NOT NULL,
    "responseTimeMin" INTEGER NOT NULL,
    "specialties" TEXT[],
    "badges" TEXT[],
    "phone" TEXT NOT NULL,
    "completedJobs" INTEGER NOT NULL,
    "bio" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerifiedPro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalStore" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StoreType" NOT NULL,
    "logo" TEXT,
    "coverImage" TEXT,
    "rating" DOUBLE PRECISION NOT NULL,
    "reviewCount" INTEGER NOT NULL,
    "distanceMiles" DOUBLE PRECISION NOT NULL,
    "deliveryEstimateMin" INTEGER NOT NULL,
    "deliveryFee" DOUBLE PRECISION NOT NULL,
    "minOrder" DOUBLE PRECISION NOT NULL,
    "address" TEXT NOT NULL,
    "isOpen" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LocalStore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreItem" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "image" TEXT,
    "inStock" BOOLEAN NOT NULL,
    "description" TEXT,

    CONSTRAINT "StoreItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "vehicleType" TEXT NOT NULL,
    "vehiclePlate" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "completedDeliveries" INTEGER NOT NULL,
    "phone" TEXT NOT NULL,
    "currentLat" DOUBLE PRECISION NOT NULL,
    "currentLng" DOUBLE PRECISION NOT NULL,
    "isOnline" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "type" "OrderType" NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT,
    "status" "OrderStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tenantName" TEXT NOT NULL,
    "tenantPhone" TEXT NOT NULL,
    "tenantAddress" TEXT NOT NULL,
    "apartmentUnit" TEXT,
    "providerId" TEXT,
    "driverId" TEXT,
    "storeId" TEXT,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "deliveryFee" DOUBLE PRECISION NOT NULL,
    "serviceFee" DOUBLE PRECISION NOT NULL,
    "tax" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "estimatedArrivalMin" INTEGER NOT NULL,
    "urgency" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "notes" TEXT,
    "tenantLat" DOUBLE PRECISION,
    "tenantLng" DOUBLE PRECISION,
    "originLat" DOUBLE PRECISION,
    "originLng" DOUBLE PRECISION,
    "currentLat" DOUBLE PRECISION,
    "currentLng" DOUBLE PRECISION,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- AddForeignKey
ALTER TABLE "StoreItem" ADD CONSTRAINT "StoreItem_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "LocalStore"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "VerifiedPro"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "LocalStore"("id") ON DELETE SET NULL ON UPDATE CASCADE;
