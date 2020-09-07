const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { Firestore } = require('@google-cloud/firestore');

const firestore = new Firestore({
    projectId: 'homeschool-nonprod',
    keyFilename: 'homeschool-nonprod-firebase-adminsdk-7t39y-1c329275cb.json'
});

admin.initializeApp();

const db = admin.firestore();

// getStudentClassesCollectionAsTeacher -> get all studentClasses provided gradeLevel studentUid as a teacher
exports.getStudentClassesCollectionAsTeacher = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  if (context.auth.uid != data.uid){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }

  return db.collection('teachers').doc(data.uid).collection('teacherStudents').doc(data.studentUid)
         .collection('gradeLevels').doc(data.currentGradeLevel).collection('classes').doc(data.studentUid).listCollections();
});

// TODO: create an event handler to update the user doc as well
exports.addStudentAsTeacherWithLoginPortal = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  if (context.auth.uid != data.uid){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  let photoURL = null;
  if(data.photoURL){
    photoURL = data.photoURL
  }
  let returnRecord = null;
  let userUid = null;
  return admin.auth().createUser({
    email: data.email,
    emailVerified: false,
    password: data.password,
    displayName: data.displayName,
    disabled: false,
  }).then(function(userRecord){
    console.log(userRecord);
    returnRecord = userRecord;
    userUid = userRecord.uid;
    return db.collection('users').doc(userRecord.uid).set({
      email: data.email,
      uid: userUid,
      teacherUid: data.uid,
      currentGradeLevel: data.currentGradeLevel,
      photoURL: photoURL,
      displayName: data.displayName,
    }).then(function(){
      return db.collection('teachers').doc(data.uid).collection('teacherStudents').doc(userUid).set({
        email: data.email,
        teacherUid: data.uid,
        currentGradeLevel: data.currentGradeLevel,
        photoURL: photoURL,
        displayName: data.displayName,
        uid: userUid,
      }).then(function(){
        return {
          message: `Sucessfully created student with login portal with ${userUid}`
        }
      }).catch(function(err){
        console.log(err);
        console.log("Couldn't create teacherStudent doc when teacher is creating student with portal");
        throw new functions.https.HttpsError("internal", "Request caused a server error");
      });
    }).catch(function(err){
      console.log(err);
      console.log("Couldn't create users doc when teacher is creating student with portal");
      throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
  }).catch(function(err) {
    console.log(err);
    console.log("Couldn't create student user portal as teacher");
    throw new functions.https.HttpsError("internal", "Request caused a server error");
  });
});

exports.addStudentAsTeacherWithoutLoginPortal = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  if (context.auth.uid != data.uid){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  let photoURL = null;
  if(data.photoURL){
    photoURL = data.photoURL
  }
  return db.collection('teachers').doc(data.uid).collection('teacherStudents').add({
    teacherUid: data.uid,
    currentGradeLevel: data.currentGradeLevel,
    photoURL: photoURL,
    displayName: data.displayName,
  }).then((docRef) => {
    studentUid = docRef.id;
    return db.collection('teachers').doc(data.uid).collection('teacherStudents').doc(studentUid).update({
      uid: studentUid,
    }).then(() => {
      return {
        message: `Sucessfully created student ${studentUid}`
      }
    }).catch(err => {
      console.log(err);
      throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
  }).catch(err => {
    console.log(err);
    throw new functions.https.HttpsError("internal", "Request caused a server error");
  });
});

exports.getStudentCollectionDocumentsAsTeacher = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  if (context.auth.uid != data.uid){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }

  return db.collection('teachers').doc(data.uid).collection('teacherStudents').get().then((querySnapshot) => {
            return querySnapshot.docs.map(doc => doc.data());
  });
});

// updateStudentEmailPasswordAsTeacher => as a teacher be able to update student email and password
exports.updateStudentEmailPasswordAsTeacher = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  if (context.auth.uid != data.uid){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }

  if(data.requireStudentEmailUpdate && data.requireStudentPasswordUpdate) {
    return admin.auth().updateUser(data.studentUid, {
      email: data.email,
      password: data.password,
    }).then(() => {
      return db.collection('teachers').doc(data.uid).collection('teacherStudents').doc(data.studentUid).update({
        email: data.email,
      }).then((teacherStudent) => {
        return {
          message: `Update email sucessfully for ${data.studentUid}`,
          data: teacherStudent,
        }
      }).catch((err) => {
        console.log(err);
        throw new functions.https.HttpsError("internal", "Request caused a server error");
      });
    }).catch((err) => {
      console.log(err);
      throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
  } else if(data.requireStudentEmailUpdate) {
    return admin.auth().updateUser(data.studentUid, {
      email: data.email,
    }).then(() => {
      return db.collection('teachers').doc(data.uid).collection('teacherStudents').doc(data.studentUid).update({
        email: data.email,
      }).then((teacherStudent) => {
        return {
          message: `Update profilePicURL sucessfully for ${data.studentUid}`,
          data: teacherStudent,
        }
      }).catch((err) => {
        console.log(err);
        throw new functions.https.HttpsError("internal", "Request caused a server error");
      });
    }).catch((err) => {
      console.log(err);
      throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
  } else if(data.requireStudentPasswordUpdate) {
    return admin.auth().updateUser(data.studentUid, {
      password: data.password,
    }).then((userRecord) => {
      return {
        message: `sucessfully updated password for ${userRecord.uid}`,
        user: userRecord,
      }
    }).catch((err) => {
      console.log(err);
      throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
  }
});

// updateStudentProfilePicAsTeacher => as a teacher be able to update student profile pic
exports.updateStudentProfilePicAsTeacher = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  if (context.auth.uid != data.uid){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  
  return db.collection('teachers').doc(data.uid).collection('teacherStudents').doc(data.studentUid).update({
    photoURL: data.photoURL,
  }).then((teacherStudent) => {
    return {
      message: `Update profilePicURL sucessfully for ${data.studentUid}`,
      data: teacherStudent,
    }
  }).catch((err) => {
    return {
      err: `Update unsucessful ${err}`,
    }
  });
});

/* updateStudentNameGradeAsTeacher => as a teacher be able to update student Name and Grade information */
exports.updateStudentNameGradeAsTeacher = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  if (context.auth.uid != data.uid){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }

  if(data.requireStudentNameUpdate && data.requireStudentGradeUpdate) {
    return db.collection('teachers').doc(data.uid).collection('teacherStudents').doc(data.studentUid).update({
      displayName: data.displayName,
      currentGradeLevel: data.currentGradeLevel,
    }).then((teacherStudent) => {
      return {
        message: `Update name and gradelevel sucessfully for ${data.studentUid}`,
        data: teacherStudent,
      }
    }).catch((err) => {
      console.log(err);
      throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
  } else if(data.requireStudentNameUpdate) {
    return db.collection('teachers').doc(data.uid).collection('teacherStudents').doc(data.studentUid).update({
      displayName: data.displayName,
    }).then((teacherStudent) => {
      return {
        message: `Update name sucessfully for ${data.studentUid}`,
        data: teacherStudent,
      }
    }).catch((err) => {
      console.log(err);
      throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
  } else if(data.requireStudentGradeUpdate) {
    return db.collection('teachers').doc(data.uid).collection('teacherStudents').doc(data.studentUid).update({
      currentGradeLevel: data.currentGradeLevel,
    }).then((teacherStudent) => {
      return {
        message: `Update student grade level sucessfully for ${data.studentUid}`,
        data: teacherStudent,
      }
    }).catch((err) => {
      console.log(err);
      throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
  }
});

exports.addAdminRole = functions.https.onCall((data, context) => {
    return firestore.collection('users')
    .doc(data.uid)
    .get()
    .then(doc => {
      if (!(doc && doc.exists)) {
        return { 
            error: 'Unable to find the document' 
        }
      }
      const docRef = doc.data();
      if (docRef.userType == "teacher") {
        return admin.auth().setCustomUserClaims(data.uid, {admin: true}).then(() => {
            return {
                message: `sucessfully created a custom claim for ${data.uid}`
            }
        }).catch(err =>{
            console.log(err);
            throw new functions.https.HttpsError("internal", "Request caused a server error");
        });
      } else {
        throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
      }
    }).catch(err => {
        console.log(err);
        throw new functions.https.HttpsError("internal", "Request caused a server error");
    });
});

exports.addUserAsAdmin = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
      throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
  
  returnRecord = null;
  return admin.auth().createUser({
      email: data.email,
      emailVerified: false,
      password: data.password,
      displayName: data.displayName,
      disabled: false
  }).then(function(userRecord){
      console.log(userRecord);
      returnRecord = userRecord;
      // create the user collection and document
      return db.collection('users').doc(userRecord.uid)
      .set({
        email: data.email,
        emailVerified: false,
        photoURL: null,
        displayName: data.displayName,
        userType: 'student',
        isNewUser: true,
        uid: userRecord.uid,
        teacherUid: data.uid
      });
      // creating the student collection is generated below with createUser of userType of student
  }).then(function(){
      return {
        user: returnRecord
      }
  }).catch(function(error){
      console.log(error);
      return {
          error: error
      }
      // throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  });
});

exports.addTeacherDocuments = functions.https.onCall((data, context) => {
  if (context.auth.token.admin !== true){
    throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
  }
//   if (context.auth.uid != data.uid){
//     throw new functions.https.HttpsError("permission-denied", "Resource not allowed");
//   }
  returnRecord = null;
  return db.collection('teachers').doc(data.uid).set({
    uid: data.uid,
    displayName: data.displayName,
    photoUrl: data.photoUrl,
    email: data.email,
    emailVerified: data.emailVerified,
    isNewUser: data.isNewUser,
    teacherStudents: data.teacherStudents,
    teacherName: data.teacherName,
    homeSchoolName: data.homeSchoolName,
    userType: "teacher"
  }).then(function(teacherRecord){
    console.log(teacherRecord);
    returnRecord = teacherRecord;
    return db.collection('users').doc(data.uid)
    .set({
        uid: data.uid,
        displayName: data.displayName,
        photoUrl: data.photoUrl,
        email: data.email,
        emailVerified: data.emailVerified,
        isNewUser: data.isNewUser,
        teacherStudents: data.teacherStudents,
        teacherName: data.teacherName,
        homeSchoolName: data.homeSchoolName,
        userType: "teacher"
    });
  }).then(function(){
    return {
        message: `Created a teacher record and updated users record sucessfully with ${returnRecord.uid}`
    }
  }).catch(function(err){
    console.log(err);
    return {
        err: err
    }
  });
});

exports.notAttendingStudent = functions.https.onCall((data, context) => {
    // need data.reason, data.uid, data.studentUids, data.datesString
    // datesString: => 2020-04-29,2020-04-30
    var listDate = [];
    var startDate = data.datesString.split(",")[0];
    var endDate = data.datesString.split(",")[1];
    var dateMove = new Date(startDate);
    var strDate = startDate;

    while (strDate < endDate){
        var strDate = dateMove.toISOString().slice(0,10);
        listDate.push(strDate);
        dateMove.setDate(dateMove.getDate()+1);
    };
    if(data.studentUids.length > 1) {
        data.studentUids.forEach((studentUid) => {
            listDate.forEach((date) => {
                return db.collection('attendance').doc(studentUid).collection(date).doc(studentUid).set({
                    teacherUid: data.uid,
                    isPresent: false,
                    reason: data.reason,
                    studentUid: studentUid,
                }).then((attendanceRecord) => {
                    console.log(attendanceRecord);
                }).catch(err => {
                    console.log(err);
                });
            });
        });
        return {
            success: `attendance recorded successfully`
        }
    } else {
        listDate.forEach((date) => {
            return db.collection('attendance').doc(data.studentUids[0]).collection(date).doc(data.studentUids[0]).set({
                teacherUid: data.uid,
                isPresent: false,
                reason: data.reason,
                studentUid: data.studentUids[0],
            }).then((attendanceRecord) => {
                console.log(attendanceRecord);
            }).catch(err => {
                console.log(err);
            });
        });
        return {
            success: `attendance recorded successfully`
        }
    }
});

/* onCreation of user with the userType of student */
exports.createUser = functions.firestore.document('users/{userId}').onCreate((snap, context) => {
  const newValue = snap.data();
  if (newValue.userType == "student") {
    return db.collection('students').doc(newValue.uid).set({ 
      displayName: newValue.displayName,
      email: newValue.email,
      emailVerified: newValue.emailVerified,
      isNewUser: newValue.isNewUser,
      photoURL: newValue.photoURL,
      teacherUid: newValue.teacherUid,
      uid: newValue.uid,
      userType: "student"
    }).then((userRecord) => {
      console.log(userRecord);
      return {
        user: userRecord
      }
    }).catch(err => {
      console.log(err);
    });
  }
});

/* onUpdate of teachers we want to update the user of userType teacher collection as well */
exports.onUpdateTeacherUser = functions.firestore.document('teachers/{teacherId}').onUpdate((snap, context) => {
  const newValue = snap.data();
  return db.collection('users').doc(newValue.uid).set({ 
      displayName: newValue.displayName,
      email: newValue.email,
      emailVerified: newValue.emailVerified,
      isNewUser: newValue.isNewUser,
      photoURL: newValue.photoURL,
      teacherUid: newValue.teacherUid,
      uid: newValue.uid,
      userType: "student"
  })
  .then((userRecord) => {
    console.log(userRecord);
    return {
      user: userRecord
    }
  }).catch(err => {
    console.log(err);
  });
});
/* onCreate of teachers we want to update the teacher user document as well */
// exports.onCreateTeacherUser = functions.firestore.document('teachers/{teacherId}').onCreate((snap, context) => {
//     const newValue = snap.data();
//     return db.collection('users').doc(newValue.uid).set({ newValue })
//     .then((userRecord) => {
//       console.log(userRecord);
//       return {
//         user: userRecord
//       }
//     }).catch(err => {
//       console.log(err);
//     });
// });

// addTeacherDocuments for the user teacher doc
