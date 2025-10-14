// TEMPORARY FIX - Load dotenv FIRST
import dotenv from "dotenv";
dotenv.config();

// Now import everything else
import express from "express";
import http from "http";
import cors from "cors";
import { Server as SocketIOServer } from "socket.io";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";
